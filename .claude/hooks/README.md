# Hooks (opcional)

Los hooks son scripts que Claude Code ejecuta antes/después de ciertas herramientas
(PreToolUse, PostToolUse, Stop, etc.). Los scripts pueden vivir acá, pero **se activan
declarándolos en `.claude/settings.json`**, no por estar en esta carpeta.

Ejemplo — correr formato/lint después de cada edición (agregar a `settings.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "pnpm lint --fix" }
        ]
      }
    ]
  }
}
```

Por ahora no hay hooks configurados — se agregan cuando haya una automatización real que los justifique.
