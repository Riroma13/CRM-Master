# KNOWN ISSUES

> Issues conocidos, no bloqueantes, priorizados.

## 🟢 Baja

- **Test pre-existing failures**: 5 tests de `lucide-react` mock fallan en tenant-web (sidebar). No relacionados con cambios recientes.

## 📌 Watcher

- Si se agrega un nuevo modelo con `clienteId`, el tenant-scope generator lo detecta automáticamente. Solo asegurarse de correr `pnpm generate` después del migration.
