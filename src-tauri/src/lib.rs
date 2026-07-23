// OAuth + Google Drive (desktop). PKCE + loopback redirect.
// TODO(fase 2): Android usa deep-link en lugar de loopback 127.0.0.1.

use base64::Engine;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::sync::Mutex;
use tauri_plugin_opener::OpenerExt;

const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const DRIVE_FILES: &str = "https://www.googleapis.com/drive/v3/files";
// Scope completo: necesario para VER carpetas existentes/compartidas (drive.file no alcanza).
const SCOPE: &str = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME: &str = "application/vnd.google-apps.folder";

/// Access token guardado tras el login, reutilizado por las llamadas a Drive.
/// ponytail: token de sesión en memoria; el refresh (expira ~1h) se agrega si hace falta.
#[derive(Default)]
struct AuthState {
    access_token: Mutex<Option<String>>,
}

#[derive(serde::Serialize)]
struct DriveFolder {
    id: String,
    name: String,
}

/// base64url(32 bytes aleatorios) → code_verifier y state.
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
/// ponytail: bloquea el worker async unos segundos durante el login; para desktop alcanza.
fn wait_for_code(listener: TcpListener, expected_state: &str) -> Result<String, String> {
    let (mut stream, _) = listener.accept().map_err(|e| e.to_string())?;

    let mut request_line = String::new();
    {
        let mut reader = BufReader::new(&stream);
        reader
            .read_line(&mut request_line)
            .map_err(|e| e.to_string())?;
    }
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
/// Google exige `client_secret` incluso en clients "Desktop app". PKCE va ADEMÁS del secret.
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

/// Arma el filtro `q` según la carpeta padre y el origen.
fn folder_query(parent_id: Option<&str>, source: &str) -> String {
    let base = format!("mimeType='{FOLDER_MIME}' and trashed=false");
    match (parent_id, source) {
        (Some(id), _) => format!("'{id}' in parents and {base}"),
        (None, "shared_with_me") => format!("sharedWithMe=true and {base}"),
        // "my_drive" y default: raíz de Mi unidad
        (None, _) => format!("'root' in parents and {base}"),
    }
}

/// Extrae `[{id, name}]` de un array JSON bajo `key` (files o drives).
fn parse_folders(json: &serde_json::Value, key: &str) -> Vec<DriveFolder> {
    json.get(key)
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|f| {
                    Some(DriveFolder {
                        id: f.get("id")?.as_str()?.to_string(),
                        name: f.get("name")?.as_str()?.to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Lista subcarpetas de un padre, o el nivel superior de un origen.
async fn list_folders_query(
    token: &str,
    parent_id: Option<&str>,
    source: &str,
) -> Result<Vec<DriveFolder>, String> {
    let mut params: Vec<(&str, String)> = vec![
        ("q", folder_query(parent_id, source)),
        ("fields", "files(id,name)".into()),
        ("pageSize", "200".into()),
        ("orderBy", "name".into()),
        ("supportsAllDrives", "true".into()),
        ("includeItemsFromAllDrives", "true".into()),
    ];
    if parent_id.is_some() {
        params.push(("corpora", "allDrives".into()));
    }
    let resp = reqwest::Client::new()
        .get(DRIVE_FILES)
        .bearer_auth(token)
        .query(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let ok = resp.status().is_success();
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if !ok {
        return Err(format!("drive error: {json}"));
    }
    Ok(parse_folders(&json, "files"))
}

/// Lista las unidades compartidas (shared drives) del usuario.
async fn list_shared_drives(token: &str) -> Result<Vec<DriveFolder>, String> {
    let resp = reqwest::Client::new()
        .get("https://www.googleapis.com/drive/v3/drives")
        .bearer_auth(token)
        .query(&[("pageSize", "100"), ("fields", "drives(id,name)")])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let ok = resp.status().is_success();
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if !ok {
        return Err(format!("drives error: {json}"));
    }
    Ok(parse_folders(&json, "drives"))
}

/// Crea una carpeta en Drive (dentro de `parent_id` si se da). Devuelve su id.
async fn create_folder(
    token: &str,
    name: &str,
    parent_id: Option<&str>,
) -> Result<DriveFolder, String> {
    let mut body = serde_json::json!({ "name": name, "mimeType": FOLDER_MIME });
    if let Some(pid) = parent_id {
        body["parents"] = serde_json::json!([pid]);
    }
    let resp = reqwest::Client::new()
        .post(DRIVE_FILES)
        .bearer_auth(token)
        .query(&[("fields", "id,name"), ("supportsAllDrives", "true")])
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let ok = resp.status().is_success();
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if !ok {
        return Err(format!("create error: {json}"));
    }
    Ok(DriveFolder {
        id: json.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        name: json.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
    })
}

/// mime type básico según la extensión, para que Drive guarde bien la foto.
fn mime_for(name: &str) -> &'static str {
    let lower = name.to_lowercase();
    if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".heic") {
        "image/heic"
    } else if lower.ends_with(".heif") {
        "image/heif"
    } else {
        "application/octet-stream"
    }
}

/// Sube una foto: 1) crea la metadata (nombre + carpeta), 2) sube el contenido.
/// ponytail: std::fs::read bloquea el worker por archivo; para lotes chicos alcanza.
async fn upload_file(
    token: &str,
    folder_id: &str,
    path: &str,
    name: &str,
) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let client = reqwest::Client::new();

    // 1. metadata: nombre renombrado + carpeta padre
    let create_resp = client
        .post(DRIVE_FILES)
        .bearer_auth(token)
        .query(&[("fields", "id"), ("supportsAllDrives", "true")])
        .json(&serde_json::json!({ "name": name, "parents": [folder_id] }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let ok = create_resp.status().is_success();
    let created: serde_json::Value = create_resp.json().await.map_err(|e| e.to_string())?;
    if !ok {
        return Err(format!("create error: {created}"));
    }
    let id = created
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or("respuesta sin id")?
        .to_string();

    // 2. contenido (media upload)
    let upload_url = format!(
        "https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media&supportsAllDrives=true"
    );
    let media_resp = client
        .patch(&upload_url)
        .bearer_auth(token)
        .header(reqwest::header::CONTENT_TYPE, mime_for(name))
        .body(bytes)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !media_resp.status().is_success() {
        let err: serde_json::Value = media_resp.json().await.unwrap_or_default();
        return Err(format!("upload error: {err}"));
    }
    Ok(id)
}

/// Devuelve el access token guardado o un error legible si no hay sesión.
fn require_token(state: &AuthState) -> Result<String, String> {
    state
        .access_token
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "no autenticado — conectá Google Drive primero".into())
}

#[tauri::command]
async fn google_login(
    app: tauri::AppHandle,
    state: tauri::State<'_, AuthState>,
    client_id: String,
    client_secret: String,
) -> Result<(), String> {
    let verifier = random_token();
    let challenge = challenge_from(&verifier);
    let auth_state = random_token();

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
            ("state", auth_state.as_str()),
            ("access_type", "offline"),
            ("prompt", "consent select_account"),
        ],
    )
    .map_err(|e| e.to_string())?;

    app.opener()
        .open_url(auth_url.to_string(), None::<&str>)
        .map_err(|e| e.to_string())?;

    let code = wait_for_code(listener, &auth_state)?;
    let token = exchange_code(&client_id, &client_secret, &code, &verifier, &redirect_uri).await?;
    *state.access_token.lock().unwrap() = Some(token);
    Ok(())
}

#[tauri::command]
async fn drive_list_folders(
    state: tauri::State<'_, AuthState>,
    parent_id: Option<String>,
    source: String,
) -> Result<Vec<DriveFolder>, String> {
    let token = require_token(&state)?;
    list_folders_query(&token, parent_id.as_deref(), &source).await
}

#[tauri::command]
async fn drive_list_shared_drives(
    state: tauri::State<'_, AuthState>,
) -> Result<Vec<DriveFolder>, String> {
    let token = require_token(&state)?;
    list_shared_drives(&token).await
}

#[tauri::command]
async fn drive_create_folder(
    state: tauri::State<'_, AuthState>,
    name: String,
    parent_id: Option<String>,
) -> Result<DriveFolder, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("el nombre de la carpeta no puede estar vacío".into());
    }
    let token = require_token(&state)?;
    create_folder(&token, name, parent_id.as_deref()).await
}

#[tauri::command]
async fn drive_upload_file(
    state: tauri::State<'_, AuthState>,
    folder_id: String,
    path: String,
    name: String,
) -> Result<String, String> {
    if folder_id.trim().is_empty() {
        return Err("elegí una carpeta destino".into());
    }
    let token = require_token(&state)?;
    upload_file(&token, &folder_id, &path, &name).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AuthState::default())
        .invoke_handler(tauri::generate_handler![
            google_login,
            drive_list_folders,
            drive_list_shared_drives,
            drive_create_folder,
            drive_upload_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
