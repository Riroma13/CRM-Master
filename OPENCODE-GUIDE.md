# Guía OpenCode para CRM-Master

> Einstein — 2026-07-04

## 🚀 Lanzar OpenCode en el VPS

Desde cualquier terminal en el VPS:

```bash
# Ir al repo
opencode /home/ubuntu/.openclaw/workspace/CRM-Master --agent gentle-orchestrator
```

O si prefieres un alias:
```bash
echo 'alias crm="opencode /home/ubuntu/.openclaw/workspace/CRM-Master --agent gentle-orchestrator"' >> ~/.bashrc
source ~/.bashrc
```

Luego simplemente:
```bash
crm
```

---

## 🎭 Modelos por fase SDD (configuración actual)

Tu `opencode.json` tiene todos los agentes SDD activos pero sin modelos específicos (usan "default").

Para asignar modelos por fase, ejecuta:

```bash
# Crear perfil "crm-dev" con modelos específicos
gentle-ai sync \
  --profile cheap:opencode-go/kimi-k2.6-code \
  --profile-phase cheap:sdd-design:opencode-go/kimi-k2.6 \
  --profile-phase cheap:sdd-propose:opencode-go/kimi-k2.6 \
  --profile-phase cheap:sdd-spec:opencode-go/kimi-k2.6 \
  --profile-phase cheap:sdd-tasks:opencode-go/kimi-k2.6 \
  --profile-phase cheap:sdd-apply:opencode-go/kimi-k2.6-code \
  --profile-phase cheap:sdd-verify:opencode-go/kimi-k2.6-code \
  --profile-phase cheap:sdd-archive:opencode-go/kimi-k2.6
```

O manualmente en `~/.config/opencode/opencode.json`:

```json
"agent": {
  "gentle-orchestrator": {
    "model": "opencode-go/kimi-k2.6",
    "mode": "primary",
    "permission": { ... }
  },
  "sdd-propose": {
    "model": "opencode-go/kimi-k2.6",
    "mode": "subagent",
    "hidden": true
  },
  "sdd-spec": {
    "model": "opencode-go/kimi-k2.6",
    "mode": "subagent",
    "hidden": true
  },
  "sdd-design": {
    "model": "opencode-go/kimi-k2.6",
    "mode": "subagent",
    "hidden": true
  },
  "sdd-tasks": {
    "model": "opencode-go/kimi-k2.6",
    "mode": "subagent",
    "hidden": true
  },
  "sdd-apply": {
    "model": "opencode-go/kimi-k2.6-code",
    "mode": "subagent",
    "hidden": true
  },
  "sdd-verify": {
    "model": "opencode-go/kimi-k2.6-code",
    "mode": "subagent",
    "hidden": true
  },
  "sdd-archive": {
    "model": "opencode-go/kimi-k2.6",
    "mode": "subagent",
    "hidden": true
  }
}
```

---

## 🎬 Flujo típico

```bash
# 1. Entrar al repo
crm

# 2. Dentro de OpenCode, iniciar SDD
/sdd-new "SPEC-0002: Autenticación multi-tenant"

# 3. Seguir las fases que el orchestrator proponga
#    (explore → propose → spec → design → tasks → apply → verify)

# 4. Cuando termine, verificar status
/sdd-status "SPEC-0002"

# 5. Archivar
/sdd-archive "SPEC-0002"
```

---

## 📱 Conectarte desde Windows

Si quieres usar OpenCode desde tu PC Windows contra el VPS:

**Opción A — SSH al VPS:**
```bash
ssh ubuntu@TU-IP-ORACLE
# Una vez dentro:
crm
```

**Opción B — OpenCode web (si está disponible):**
```bash
# En el VPS
opencode serve --port 8080 --hostname 0.0.0.0
```
Luego abre `http://TU-IP:8080` en tu navegador.

---

## 🧠 Tips importantes

- **No uses OpenCode para chat casual.** Usa OpenClaw (este chat) para preguntas, resúmenes, heartbeats.
- **OpenCode = solo para SDD y coding.** Es más eficiente y tiene sub-agentes reales.
- **Guarda tu trabajo.** OpenCode no tiene memoria automática entre sesiones (a menos que uses Engram). Guarda specs y resultados en el repo.

---

## ✅ Próximo paso

Ejecuta en el VPS:
```bash
crm
```

Y dentro de OpenCode, escribe:
```
/sdd-new "SPEC-0002: Autenticación multi-tenant y aislamiento"
```

El orchestrator te guiará por todas las fases. 🚀
