---
name: security-review
description: >
  Revisión de seguridad para photos-to-drive (Tauri v2 + Google Drive OAuth). Trigger: al revisar
  manejo de tokens OAuth, scopes de Drive, capabilities de Tauri, secretos, o antes de un release.
---

## Cuándo usar

- Antes de un release o de exponer el OAuth de producción.
- Al tocar almacenamiento de tokens, scopes, deep-links o capabilities de Tauri.

## Checklist

### OAuth / Google Drive
- [ ] Scope mínimo necesario. `drive.file` si alcanza; `drive` completo solo si hay que listar carpetas ajenas/compartidas (implica verificación CASA).
- [ ] Refresh tokens guardados de forma segura (keychain/secure store del SO), **nunca** en texto plano ni en el repo.
- [ ] `client_secret` fuera del bundle público cuando aplique; usar PKCE en clientes públicos.
- [ ] Redirect URIs restringidos; deep-link con esquema propio validado (mobile).
- [ ] Estado `state` + PKCE para prevenir CSRF/interceptación en el flujo OAuth.

### Tauri v2
- [ ] `capabilities/` con el permiso mínimo — sin `fs`/`shell` abiertos de más.
- [ ] CSP configurada en `tauri.conf.json`; sin `unsafe-eval`.
- [ ] Comandos Rust validan sus inputs (paths, nombres de carpeta/archivo).

### Datos / secretos
- [ ] Sin secretos commiteados. `.env` en `.gitignore`.
- [ ] Nombres de archivo/carpeta sanitizados (path traversal, caracteres inválidos en Drive).
- [ ] Logs sin tokens ni datos personales.

## Salida
Reportá por severidad (CRITICAL / WARNING / SUGGESTION) con archivo:línea y el WHY técnico.
