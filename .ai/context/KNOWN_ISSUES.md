---
classification: PROJECT CONTEXT
semantic_authority: false
scope: known non-blocking debt only
---

# KNOWN ISSUES

> Issues conocidos, no bloqueantes, priorizados.

## 🟢 Baja

- **Test pre-existing failures**: 5 tests de `lucide-react` mock fallan en tenant-web (sidebar). No relacionados con cambios recientes.

## 📌 Watcher

- Si se agrega un nuevo modelo con `clienteId`, el tenant-scope generator lo detecta automáticamente. Solo asegurarse de correr `pnpm generate` después del migration.

## Governance Debt

- Historical v2.1 prompts and candidate/archive records remain in their
  historical locations. They are marked non-authoritative and are excluded from
  the active CRM-SDD routing path.
- Global OpenCode/Gentle configuration remains outside the repository and is
  intentionally untouched. Project-local runtime boundaries are validated
  without claiming that global files were removed.
