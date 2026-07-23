// Spike OAuth — Google Drive (desktop, PKCE + loopback redirect).
// Prueba el riesgo #1: completar el OAuth y capturar el redirect en Tauri v2.
// TODO(fase 2): Android usa deep-link en lugar de loopback 127.0.0.1.

use base64::Engine;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use tauri_plugin_opener::OpenerExt;

const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const DRIVE_FILES: &str = "https://www.googleapis.com/drive/v3/files";
// Scope completo: necesario para VER carpetas existentes/compartidas (drive.file no alcanza).
// En modo Testing de Google no requiere verificación CASA.
const SCOPE: &str = "https://www.googleapis.com/auth/drive";

#[derive(serde::Serialize)]
struct DriveFolder {
    id: String,
    name: String,
}

/// base64url(32 bytes aleatorios) → sirve como code_verifier y como state.
fn random_token() -> String {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("rng disponible");
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

/// code_challenge = base64url(SHA256(verifier)) — PKCE S256.
fn challenge_from(verifier: &str) -> String {
    use sha2::{Digest, Sha256};
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

/// Espera UNA conexión en el loopback, extrae `code` y valida `state`.
/// ponytail: bloquea el worker async unos segundos durante el login; para un spike alcanza.
fn wait_for_code(listener: TcpListener, expected_state: &str) -> Result<String, String> {
    let (mut stream, _) = listener.accept().map_err(|e| e.to_string())?;

    let mut request_line = String::new();
    {
        let mut reader = BufReader::new(&stream);
        reader
            .read_line(&mut request_line)
            .map_err(|e| e.to_string())?;
    }
    // request_line = "GET /?code=XXX&state=YYY HTTP/1.1"
    let path = request_line
        .split_whitespace()
        .nth(1)
        .ok_or("request sin path")?;
    let parsed =
        url::Url::parse(&format!("http://127.0.0.1{path}")).map_err(|e| e.to_string())?;

    let mut code = None;
    let mut state = None;
    for (k, v) in parsed.query_pairs() {
        match k.as_ref() {
            "code" => code = Some(v.into_owned()),
            "state" => state = Some(v.into_owned()),
            _ => {}
        }
    }

    let body = "<html><body style='font-family:sans-serif;text-align:center;padding-top:3rem'>\
        <h2>Listo ✅</h2><p>Podés cerrar esta pestaña y volver a la app.</p></body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());

    match (code, state) {
        (Some(c), Some(s)) if s == expected_state => Ok(c),
        (_, Some(_)) => Err("state no coincide (posible interceptación)".into()),
        _ => Err("el redirect no trajo `code`".into()),
    }
}

/// Intercambia el authorization code por un access_token.
/// Google exige `client_secret` incluso en clients "Desktop app" (no es confidencial
/// para apps instaladas, pero el token endpoint lo pide). PKCE va ADEMÁS del secret.
async fn exchange_code(
    client_id: &str,
    client_secret: &str,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
) -> Result<String, String> {
    let resp = reqwest::Client::new()
        .post(TOKEN_ENDPOINT)
        .form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("code", code),
            ("code_verifier", verifier),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let ok = resp.status().is_success();
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if !ok {
        return Err(format!("token error: {json}"));
    }
    json.get("access_token")
        .and_then(|v| v.as_str())
        .map(String::from)
        .ok_or_else(|| "respuesta sin access_token".into())
}

/// Lista carpetas incluyendo shared drives y "Compartido conmigo".
async fn list_folders(token: &str) -> Result<Vec<DriveFolder>, String> {
    let resp = reqwest::Client::new()
        .get(DRIVE_FILES)
        .bearer_auth(token)
        .query(&[
            ("q", "mimeType='application/vnd.google-apps.folder' and trashed=false"),
            ("fields", "files(id,name)"),
            ("pageSize", "100"),
            // Estos tres son los que destraban las carpetas compartidas:
            ("supportsAllDrives", "true"),
            ("includeItemsFromAllDrives", "true"),
            ("corpora", "allDrives"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let ok = resp.status().is_success();
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if !ok {
        return Err(format!("drive error: {json}"));
    }
    let folders = json
        .get("files")
        .and_then(|v| v.as_array())
        .map(|files| {
            files
                .iter()
                .filter_map(|f| {
                    Some(DriveFolder {
                        id: f.get("id")?.as_str()?.to_string(),
                        name: f.get("name")?.as_str()?.to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    Ok(folders)
}

/// Comando único: login con Google + listar carpetas. Prueba todo el flujo de una.
#[tauri::command]
async fn google_drive_login(
    app: tauri::AppHandle,
    client_id: String,
    client_secret: String,
) -> Result<Vec<DriveFolder>, String> {
    let verifier = random_token();
    let challenge = challenge_from(&verifier);
    let state = random_token();

    // Loopback en puerto libre → es el redirect_uri.
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_uri = format!("http://127.0.0.1:{port}");

    let auth_url = url::Url::parse_with_params(
        AUTH_ENDPOINT,
        &[
            ("client_id", client_id.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("response_type", "code"),
            ("scope", SCOPE),
            ("code_challenge", challenge.as_str()),
            ("code_challenge_method", "S256"),
            ("state", state.as_str()),
            ("access_type", "offline"),
            ("prompt", "consent select_account"),
        ],
    )
    .map_err(|e| e.to_string())?;

    // Abre el navegador del sistema (reutiliza el plugin opener ya instalado).
    app.opener()
        .open_url(auth_url.to_string(), None::<&str>)
        .map_err(|e| e.to_string())?;

    let code = wait_for_code(listener, &state)?;
    let token = exchange_code(&client_id, &client_secret, &code, &verifier, &redirect_uri).await?;
    list_folders(&token).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![google_drive_login])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
