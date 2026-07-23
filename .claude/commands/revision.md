---
description: Revisión de código de los cambios pendientes (correctness, tipos, tests)
argument-hint: "[ruta o área opcional]"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status)
---

Revisá los cambios pendientes en el working tree${1:+ enfocándote en: $1}.

Contexto: app Tauri v2 + React 19 + TypeScript strict. Núcleo: subida de fotos a Google Drive
con renombrado `<nombre> (<orden>).<tipo>`.

Reportá por severidad (CRITICAL / WARNING / SUGGESTION):

1. **Correctness** — bugs, edge cases, manejo de errores por archivo en la subida.
2. **Tipos** — `any` sin justificar, tipos laxos, nullabilidad no manejada.
3. **Drive/OAuth** — scopes correctos, `supportsAllDrives`/`includeItemsFromAllDrives`, multi-cuenta.
4. **Renombrado** — orden, colisiones de nombre, extensión/tipo, caracteres inválidos.
5. **Tests** — ¿la lógica no trivial tiene cobertura Vitest / cargo test?

No arregles nada todavía: primero mostrá el WHY técnico de cada hallazgo.
