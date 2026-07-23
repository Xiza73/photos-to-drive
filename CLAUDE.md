# CLAUDE.md — photos-to-drive

Instrucciones del equipo para trabajar con Claude Code en este repositorio.
Este archivo se commitea. Los overrides personales van en `CLAUDE.local.md` (gitignored).

## Contexto del proyecto

App multiplataforma (**desktop + Android APK**) para **subir lotes de fotos a Google Drive**
con renombrado automático y control de la carpeta destino.

El flujo central es un formulario:

1. Seleccionar un conjunto de fotos del dispositivo.
2. Elegir la cuenta de Google (soporte **multi-cuenta**).
3. Seleccionar o **crear** la carpeta destino en Drive (incluye carpetas **compartidas** / shared drives).
4. Definir un **identificador de carpeta** (nombre concreto de la carpeta en Drive).
5. Definir un **identificador base** para el nombre de las fotos.
6. Subir el lote renombrando cada archivo como `<nombre> (<orden>).<tipo>`
   — ej. `boda (1).jpg`, `boda (2).jpg`, `boda (3).png`.

## Usuarios y alcance (MVP)

Usuario objetivo: alguien que sube tandas de fotos a Drive de forma repetitiva (eventos, entregas,
clientes) y necesita nombres/carpetas consistentes sin renombrar a mano.

**MVP (lo mínimo que debe funcionar):**

- [ ] Selección múltiple de fotos (desktop: file dialog · mobile: image picker).
- [ ] OAuth con Google, con soporte de más de una cuenta.
- [ ] Listar / crear carpeta destino en Drive, incluyendo "Compartido conmigo" y shared drives.
- [ ] Campo identificador de carpeta + campo identificador de fotos.
- [ ] Renombrado `<nombre> (<orden>).<tipo>` aplicado al subir.
- [ ] Subida del lote con indicador de progreso y manejo de errores por archivo.

**Fuera del MVP (después):** historial sincronizado entre dispositivos, edición de fotos,
compresión, subida en background, colas persistentes.

## Stack y herramientas

- **Core:** Tauri v2 (Rust) — desktop + Android.
- **UI:** React 19 + TypeScript (strict) + Tailwind.
- **Testing:** Vitest (lado TS) · `cargo test` (lado Rust).
- **Gestor de paquetes:** pnpm *(propuesto — cambialo si usás npm/bun/yarn)*.

> Skills locales relevantes en `skills/`: `tauri-v2`, `vitest`, `git-flow`, `github-pr`, `delivery-handoff`.
> Cargalas antes de escribir código del área correspondiente.

## Comandos clave

> Propuestos según el stack. Confirmá/ajustá cuando exista `package.json` y `src-tauri/`.

```bash
pnpm install            # instalar dependencias JS
pnpm tauri dev          # dev (desktop)
pnpm tauri android dev  # dev (Android)
pnpm test               # Vitest
pnpm lint               # ESLint
cargo test              # tests Rust (desde src-tauri/)
cargo clippy            # lint Rust
```

Build (se corre manualmente, no de forma automática): `pnpm tauri build` · `pnpm tauri android build`.

## Convenciones de código

- **Concepts > code:** entender el porqué antes de tocar una línea.
- TypeScript en modo **strict**. Nada de `any` sin justificación.
- React 19: sin `useMemo`/`useCallback` manuales (React Compiler). Componentes chicos y con una responsabilidad.
- Rust: `cargo fmt` + `cargo clippy` limpios antes de commitear.
- Nombres descriptivos. Sin abstracciones especulativas: no crear interfaces con una sola implementación.
- La lógica de renombrado y de Drive vive en módulos aislados y **testeados**.

## Estructura del repositorio

Single-package (una sola app Tauri):

```
photos-to-drive/
├── src/                 # UI React + TS
├── src-tauri/           # core Rust (comandos, plugins, capabilities)
├── skills/              # skills locales de Claude Code
├── .claude/             # config del equipo (commands, skills, agents, settings)
├── CLAUDE.md            # este archivo
└── CLAUDE.local.md      # overrides personales (gitignored)
```

## Integraciones externas

- **Google Drive API** — núcleo del proyecto (OAuth 2.0 + subida de archivos).
- **Supabase** — *diferido*. No entra en el MVP; se evalúa si aparece necesidad de sincronizar
  estado entre dispositivos.

### ⚠️ Riesgo #1 — OAuth de Google (validar primero, es lo más frágil)

- Para elegir carpetas **existentes/compartidas** se necesita el scope `drive` completo
  (no alcanza `drive.file`) → dispara **verificación de Google (CASA)** para producción.
- **Multi-cuenta:** un flujo OAuth por cuenta; guardar un refresh token por cuenta.
- **Carpetas compartidas:** al listar/crear pasar `supportsAllDrives=true` e
  `includeItemsFromAllDrives=true`.
- **Mobile (APK):** el redirect a `localhost` del desktop no funciona en Android → usar
  **deep link** con esquema propio + plugin de deep-link de Tauri v2.

Primer spike técnico sugerido antes de construir el form.

## Reglas de trabajo con Claude

**Hacer:**

- Entender el problema y confirmar el enfoque antes de escribir código.
- Cargar la skill correspondiente (`tauri-v2`, `vitest`, etc.) antes de tocar esa área.
- Proponer la solución más simple que funcione; marcar simplificaciones deliberadas.
- Tests para lógica no trivial (renombrado, parsing, llamadas a Drive).

**NO hacer:**

- **No** buildear automáticamente después de cambios.
- **No** agregar dependencias nuevas para algo que resuelven pocas líneas o el stdlib.
- **No** meter Supabase u otros servicios sin una feature que los requiera.
- **No** asumir respuestas: si falta contexto, preguntar y esperar.

### Git — Conventional Commits

- Formato: `tipo(scope): descripción` — ej. `feat(upload): renombrado <nombre> (<orden>)`.
- Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`.
- **Sin** líneas `Co-Authored-By` ni atribución de IA en los commits.
- Ver skill `git-flow` para ramas y política de PRs.
