---
description: Workflow para resolver un bug de punta a punta (reproducir → aislar → arreglar → test)
argument-hint: "<nº de issue o descripción del bug>"
allowed-tools: Read, Grep, Glob, Edit, Bash(git diff:*), Bash(git status), Bash(pnpm test:*), Bash(cargo test:*)
---

Bug a resolver: **$ARGUMENTS**

Seguí este workflow, sin saltarte pasos:

1. **Reproducir** — entendé el comportamiento esperado vs. el real. Si no podés reproducirlo,
   pedí los pasos antes de tocar código.
2. **Aislar** — encontrá el origen (no el síntoma). Mostrame el archivo:línea de la causa raíz.
3. **Arreglar** — el cambio mínimo que corrige la causa. Nada de refactors oportunistas.
4. **Test** — dejá una prueba que falle sin el fix y pase con él (Vitest o cargo test).
5. **Resumen** — causa raíz, qué cambiaste y por qué.

Recordá: Conventional Commits, sin `Co-Authored-By`.
