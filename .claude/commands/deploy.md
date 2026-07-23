---
description: Pasos de despliegue de la app Tauri (desktop bundle + Android APK)
argument-hint: "[desktop | android | all]"
allowed-tools: Read, Bash(git status), Bash(git log:*)
---

Objetivo de despliegue: **${1:-all}**

Guiá el despliegue paso a paso. NO buildees automáticamente — mostrá los comandos y esperá
confirmación antes de cada build (regla del proyecto: no buildear solo).

**Pre-vuelo:**

- [ ] `git status` limpio y en la rama correcta.
- [ ] `pnpm test` y `cargo test` en verde.
- [ ] Versión actualizada en `src-tauri/tauri.conf.json` y `package.json`.
- [ ] Variables/secretos de OAuth de producción configurados (no los de dev).

**Desktop:**

```bash
pnpm install
pnpm tauri build
```

Los instaladores quedan en `src-tauri/target/release/bundle/`.

**Android (APK):**

```bash
pnpm tauri android build --apk
```

Requiere firma configurada (keystore) y el redirect por deep-link del OAuth validado en dispositivo.
El APK queda en `src-tauri/gen/android/app/build/outputs/`.

**Post-deploy:** verificar OAuth end-to-end en cada plataforma (es el punto frágil, ver Riesgo #1 en CLAUDE.md).
