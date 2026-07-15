# KNOWN ISSUES

> Issues conocidos, no bloqueantes, priorizados.

## 🟡 Media

- **Rate limiter sin cleanup**: el `setInterval` del rate limiter en `ClientAuthService` no tiene `OnModuleDestroy`. En producción continua, puede acumular entradas en memoria. Solución: implementar `OnModuleDestroy` con `clearInterval`.

## 🟢 Baja

- **Test pre-existing failures**: 5 tests de `lucide-react` mock fallan en tenant-web (sidebar). No relacionados con cambios recientes.
- **Jest no cierra automáticamente**: el rate limiter deja una async operation abierta. Usar `--forceExit` o implementar `OnModuleDestroy`.

## 📌 Watcher

- Si se agrega un nuevo modelo con `clienteId`, el tenant-scope generator lo detecta automáticamente. Solo asegurarse de correr `pnpm generate` después del migration.
