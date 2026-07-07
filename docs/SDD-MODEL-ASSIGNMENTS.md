# Asignación de Modelos por Fase SDD — CRM-Master

> Fecha: 2026-07-04
> Propuesta: Einstein
> Estado: PENDIENTE APROBACIÓN

---

## 📋 Modelos disponibles (opencode-go)

| Modelo | Tipo | Ideal para |
|--------|------|------------|
| `kimi-k2.6` | General / Reasoning | Diseño, planning, orquestación |
| `kimi-k2.7-code` | Código | Implementación, tests, refactor |
| `deepseek-v4-pro` | Razonamiento avanzado | Arquitectura compleja, decisiones críticas |
| `deepseek-v4-flash` | Código rápido | Tareas mecánicas, scaffolding |
| `qwen3.7-max` | Razonamiento máximo | Proposals, specs, reviews adversariales |
| `qwen3.7-plus` | Equilibrado | Tareas mixtas |
| `glm-5.2` | General | Fallback económico |
| `mimo-v2.5-pro` | Código pro | Implementación premium |
| `minimax-m3` | General | Alternativa equilibrada |

---

## 🎯 Propuesta de asignación

### **Perfil: "crm-dev" (equilibrado profesional)**

| Fase / Agente | Modelo asignado | Razón |
|--------------|-----------------|-------|
| **gentle-orchestrator** | `kimi-k2.6` | Equilibrado, buen contexto, ya lo conocemos |
| **sdd-init** | `kimi-k2.6` | Detectar stack, pruebas, configuración |
| **sdd-explore** | `kimi-k2.6` | Explorar codebase, entender estado |
| **sdd-propose** | `qwen3.7-max` | Máximo razonamiento para proposals de negocio |
| **sdd-spec** | `qwen3.7-max` | Specs completas, casos de borde, API design |
| **sdd-design** | `deepseek-v4-pro` | Arquitectura técnica, ADRs, decisiones complejas |
| **sdd-tasks** | `kimi-k2.6` | Descomposición lógica, dependencias |
| **sdd-apply** | `kimi-k2.7-code` | Implementación de código, tests, TDD |
| **sdd-verify** | `kimi-k2.7-code` | Validación, tests de fuga, cobertura |
| **sdd-archive** | `kimi-k2.6` | Documentación, resumen, cierre |
| **jd-judge-a** | `qwen3.7-max` | Revisión adversarial crítica (máxima calidad) |
| **jd-judge-b** | `deepseek-v4-pro` | Segunda opinión adversarial |
| **review-readability** | `kimi-k2.6` | Legibilidad, naming, complejidad |
| **review-reliability** | `kimi-k2.6` | Tests, cobertura, determinismo |
| **review-resilience** | `kimi-k2.6` | Fallbacks, observability, SLOs |
| **review-risk** | `deepseek-v4-pro` | Seguridad, auth, multi-tenancy risks |
| **jd-fix-agent** | `kimi-k2.7-code` | Reparación quirúrgica de issues |

---

## 🧠 Lógica detrás de la asignación

### **Fases de Planning (Thinking ON)**
- `sdd-propose` → `qwen3.7-max`: La proposal define todo lo demás. Máxima calidad de razonamiento.
- `sdd-spec` → `qwen3.7-max`: Specs son contratos. Necesitan precisión extrema.
- `sdd-design` → `deepseek-v4-pro`: Decisiones arquitectónicas complejas, justificación de trade-offs.

### **Fases de Ejecución (Thinking OFF, Coding ON)**
- `sdd-apply` → `kimi-k2.7-code`: Especializado en código. Rápido, eficiente, sigue TDD.
- `sdd-verify` → `kimi-k2.7-code`: Valida implementación. Tests, lint, cobertura.
- `jd-fix-agent` → `kimi-k2.7-code`: Reparación quirúrgica. Precisión sobre razonamiento.

### **Reviews Adversariales (Thinking ON, Crítico)**
- `jd-judge-a` → `qwen3.7-max`: El juez principal. Debe ser el modelo más crítico.
- `jd-judge-b` → `deepseek-v4-pro`: Segunda opinión con diferente arquitectura de modelo.
- `review-risk` → `deepseek-v4-pro`: Seguridad y multi-tenancy requieren máxima atención.

### **Orchestrator (Equilibrado)**
- `gentle-orchestrator` → `kimi-k2.6`: Ya lo conocemos, buen balance razonamiento/código.

---

## ⚙️ Cómo aplicar esta configuración

### **Opción A: Via gentle-ai CLI (recomendado)**

```bash
# Crear perfil "crm-dev"
gentle-ai sync \
  --profile crm-dev:opencode-go/kimi-k2.6 \
  --profile-phase crm-dev:sdd-propose:opencode-go/qwen3.7-max \
  --profile-phase crm-dev:sdd-spec:opencode-go/qwen3.7-max \
  --profile-phase crm-dev:sdd-design:opencode-go/deepseek-v4-pro \
  --profile-phase crm-dev:sdd-apply:opencode-go/kimi-k2.7-code \
  --profile-phase crm-dev:sdd-verify:opencode-go/kimi-k2.7-code \
  --profile-phase crm-dev:jd-judge-a:opencode-go/qwen3.7-max \
  --profile-phase crm-dev:jd-judge-b:opencode-go/deepseek-v4-pro \
  --profile-phase crm-dev:review-risk:opencode-go/deepseek-v4-pro \
  --profile-phase crm-dev:jd-fix-agent:opencode-go/kimi-k2.7-code
```

### **Opción B: Manual (edición directa de opencode.json)**

Editar `~/.config/opencode/opencode.json` y añadir `"model": "..."` a cada agente.

### **Opción C: Script de configuración**

```bash
# Script automático (yo puedo generarlo)
python3 ~/CRM-Master/scripts/setup-models.py
```

---

## 🤔 Alternativas

### **Perfil "crm-cheap" (económico)**
- Planning: `glm-5.2` o `deepseek-v4-flash`
- Coding: `deepseek-v4-flash`
- Reviews: `kimi-k2.6`

### **Perfil "crm-premium" (máxima calidad)**
- Todo: `qwen3.7-max` o `deepseek-v4-pro`

---

## ✅ Decisión pendiente

Ricardo: ¿Aprobas la asignación "crm-dev" arriba?
¿Quieres ajustar algún modelo?
¿Prefieres el perfil "cheap", "dev" o "premium"?

Dime **"aprobado"** y lo aplico al `opencode.json`.
