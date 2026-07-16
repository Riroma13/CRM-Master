# ROADMAP — CRM-Master

> Próximos hitos y dirección del producto.

## 🔜 Siguiente

- [ ] **Merge PR2 (Client Platform)** — backend + frontend + fixes
- [ ] **Activar portal cliente** — `NEXT_PUBLIC_CLIENT_PORTAL_ENABLED=true` (cuando Better-Auth esté listo)

## 📋 Pendientes técnicos

- [x] `OnModuleDestroy` para el rate limiter (limpiar interval)
- [x] Test de integridad: verificar que modelos generados cubran schema
- [x] CI check: `pnpm generate:scope:verify` en el pipeline
- [x] Documentar el tenant-scope generator en `docs/`

## 🏗️ Próximas features (idea)

- Client self-registration
- OAuth social login
- Password reset email
- Mobile app
