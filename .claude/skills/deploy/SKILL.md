---
name: deploy
description: >
  Guía de despliegue de photos-to-drive (Tauri v2: bundle desktop + APK Android). Trigger: al preparar
  un release, versionar, firmar el APK, o publicar instaladores.
---

## Cuándo usar

Al preparar un release de desktop y/o Android. Complementa el slash command `/deploy`.

## Pre-vuelo (obligatorio)

- [ ] `git status` limpio, rama correcta.
- [ ] `pnpm test` + `cargo test` en verde.
- [ ] Bump de versión en `package.json` y `src-tauri/tauri.conf.json` (deben coincidir).
- [ ] Secretos/OAuth de **producción** cargados (no los de dev).
- [ ] CHANGELOG / notas de release actualizadas.

## Desktop

```bash
pnpm install
pnpm tauri build   # correr manualmente, no automático
```

Salida: `src-tauri/target/release/bundle/`.

## Android (APK)

```bash
pnpm tauri android build --apk
```

- Requiere keystore de firma configurado.
- El **deep-link del OAuth** debe estar validado en un dispositivo real antes de publicar.
- Salida: `src-tauri/gen/android/app/build/outputs/`.

## Post-deploy

- [ ] Instalar y probar OAuth end-to-end en cada plataforma (Riesgo #1 en CLAUDE.md).
- [ ] Tag de versión: `git tag vX.Y.Z` (ver skill `git-flow`).

> Regla del proyecto: **no buildear automáticamente**. Mostrar comandos y esperar confirmación.
