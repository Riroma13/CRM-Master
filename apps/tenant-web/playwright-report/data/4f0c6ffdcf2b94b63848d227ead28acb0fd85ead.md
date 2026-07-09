# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-booking-calendario.spec.ts >> Booking & Calendario >> admin can create cita manually
- Location: e2e/05-booking-calendario.spec.ts:12:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Crear cita")')
    - locator resolved to <button disabled type="submit" class="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-[#0F172A]/90 h-8 rounded-[0.25rem] px-3 gap-1.5 bg-[#131B2E] text-xs text-white">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e7]: D
        - generic [ref=e8]:
          - heading "Demo Asesoría" [level=1] [ref=e9]
          - paragraph [ref=e10]: Panel de gestión
      - navigation [ref=e11]:
        - link "Dashboard" [ref=e12] [cursor=pointer]:
          - /url: /admin
          - img [ref=e13]
          - generic [ref=e18]: Dashboard
        - link "Clientes" [ref=e19] [cursor=pointer]:
          - /url: /admin/clientes
          - img [ref=e20]
          - generic [ref=e25]: Clientes
        - link "Documentos" [ref=e26] [cursor=pointer]:
          - /url: /admin/documentos
          - img [ref=e27]
          - generic [ref=e30]: Documentos
        - link "Tareas" [ref=e31] [cursor=pointer]:
          - /url: /admin/tareas
          - img [ref=e32]
          - generic [ref=e35]: Tareas
        - link "Calendario" [ref=e36] [cursor=pointer]:
          - /url: /admin/calendario
          - img [ref=e37]
          - generic [ref=e39]: Calendario
        - link "Recursos" [ref=e40] [cursor=pointer]:
          - /url: /admin/recursos
          - img [ref=e41]
          - generic [ref=e44]: Recursos
        - link "Sistemas" [ref=e45] [cursor=pointer]:
          - /url: /admin/sistemas
          - img [ref=e46]
          - generic [ref=e48]: Sistemas
        - link "Perfil" [ref=e49] [cursor=pointer]:
          - /url: /admin/perfil
          - img [ref=e50]
          - generic [ref=e53]: Perfil
        - link "Onboarding" [ref=e54] [cursor=pointer]:
          - /url: /admin/onboarding
          - img [ref=e55]
          - generic [ref=e60]: Onboarding
        - link "Módulos" [ref=e61] [cursor=pointer]:
          - /url: /admin/modules
          - img [ref=e62]
          - generic [ref=e65]: Módulos
    - generic [ref=e66]:
      - button "Notificaciones" [ref=e69]:
        - img [ref=e70]
        - generic [ref=e73]: "5"
      - main [ref=e74]:
        - generic [ref=e75]:
          - navigation "Breadcrumb" [ref=e76]:
            - link "Dashboard" [ref=e78] [cursor=pointer]:
              - /url: /admin
            - generic [ref=e79]:
              - img [ref=e80]
              - generic [ref=e82]: Calendario
          - generic [ref=e83]:
            - generic [ref=e84]:
              - heading "Calendario" [level=1] [ref=e85]
              - generic [ref=e86]:
                - button "Nueva cita" [ref=e87]:
                  - img [ref=e88]
                  - text: Nueva cita
                - button "Refrescar" [ref=e89]
            - generic [ref=e90]:
              - generic [ref=e91]:
                - paragraph [ref=e92]: Citas hoy
                - paragraph [ref=e93]: "1"
              - generic [ref=e94]:
                - paragraph [ref=e95]: Pendientes
                - paragraph [ref=e96]: "5"
              - generic [ref=e97]:
                - paragraph [ref=e98]: Esta semana
                - paragraph [ref=e99]: "10"
            - generic [ref=e100]:
              - generic [ref=e101]:
                - button "Próximas" [ref=e102]
                - button "Historial" [ref=e103]
              - generic [ref=e104]:
                - generic [ref=e106]:
                  - generic [ref=e107]:
                    - heading "Test Booking" [level=3] [ref=e108]
                    - paragraph [ref=e109]: test@test.com
                    - paragraph [ref=e110]: 13 jul 2026 · 15:00 · 30 min
                  - generic [ref=e111]: Confirmada
                - generic [ref=e112]:
                  - generic [ref=e113]:
                    - generic [ref=e114]:
                      - heading "Test Cliente" [level=3] [ref=e115]
                      - paragraph [ref=e116]: test@test.com
                      - paragraph [ref=e117]: 11 jul 2026 · 07:00 · 30 min
                    - generic [ref=e118]: Pendiente
                  - generic [ref=e119]:
                    - button "Confirmar" [ref=e120]
                    - button "Cancelar" [ref=e121]
                - generic [ref=e122]:
                  - generic [ref=e123]:
                    - generic [ref=e124]:
                      - heading "Pedro López" [level=3] [ref=e125]
                      - paragraph [ref=e126]: pedro@example.com
                      - paragraph [ref=e127]: 10 jul 2026 · 09:23 · 60 min
                    - generic [ref=e128]: Pendiente
                  - generic [ref=e129]:
                    - button "Confirmar" [ref=e130]
                    - button "Cancelar" [ref=e131]
                - generic [ref=e133]:
                  - generic [ref=e134]:
                    - heading "María García" [level=3] [ref=e135]
                    - paragraph [ref=e136]: maria@example.com
                    - paragraph [ref=e137]: 9 jul 2026 · 09:23 · 30 min
                  - generic [ref=e138]: Confirmada
                - generic [ref=e139]:
                  - generic [ref=e140]:
                    - generic [ref=e141]:
                      - heading "Laura Sánchez" [level=3] [ref=e142]
                      - paragraph [ref=e143]: laura@example.com
                      - paragraph [ref=e144]: 8 jul 2026 · 12:23 · 30 min
                    - generic [ref=e145]: Pendiente
                  - generic [ref=e146]:
                    - button "Confirmar" [ref=e147]
                    - button "Cancelar" [ref=e148]
                - generic [ref=e149]:
                  - generic [ref=e150]:
                    - generic [ref=e151]:
                      - heading "Carlos Ruiz" [level=3] [ref=e152]
                      - paragraph [ref=e153]: carlos@example.com
                      - paragraph [ref=e154]: 8 jul 2026 · 11:23 · 45 min
                    - generic [ref=e155]: Pendiente
                  - generic [ref=e156]:
                    - button "Confirmar" [ref=e157]
                    - button "Cancelar" [ref=e158]
                - generic [ref=e159]:
                  - generic [ref=e160]:
                    - generic [ref=e161]:
                      - heading "Ana Martínez" [level=3] [ref=e162]
                      - paragraph [ref=e163]: ana@example.com
                      - paragraph [ref=e164]: 8 jul 2026 · 10:23 · 30 min
                    - generic [ref=e165]: Pendiente
                  - generic [ref=e166]:
                    - button "Confirmar" [ref=e167]
                    - button "Cancelar" [ref=e168]
            - generic [ref=e169]:
              - heading "Configuración" [level=2] [ref=e170]
              - generic [ref=e171]:
                - heading "Horario semanal" [level=3] [ref=e172]
                - generic [ref=e173]:
                  - button "+ Mié" [ref=e174]
                  - button "+ Jue" [ref=e175]
                  - button "+ Vie" [ref=e176]
                - generic [ref=e177]:
                  - paragraph [ref=e178]: Lun
                  - generic [ref=e179]:
                    - textbox [active] [ref=e180]: 10:00
                    - generic [ref=e181]: →
                    - textbox [ref=e182]: 14:00
                    - button "Quitar" [ref=e183]
                  - generic [ref=e184]:
                    - textbox [ref=e185]: 16:00
                    - generic [ref=e186]: →
                    - textbox [ref=e187]: 19:00
                    - button "Quitar" [ref=e188]
                  - button "+ Añadir horario" [ref=e189]
                - generic [ref=e190]:
                  - paragraph [ref=e191]: Mar
                  - generic [ref=e192]:
                    - textbox [ref=e193]: 09:00
                    - generic [ref=e194]: →
                    - textbox [ref=e195]: 14:00
                    - button "Quitar" [ref=e196]
                  - button "+ Añadir horario" [ref=e197]
              - separator [ref=e198]
              - generic [ref=e199]:
                - heading "Fechas bloqueadas" [level=3] [ref=e200]
                - generic [ref=e201]:
                  - textbox [ref=e202]: 2026-07-10
                  - button "Bloquear" [ref=e203]
                - paragraph [ref=e204]: No hay fechas bloqueadas. Añade una fecha para bloquear el día completo.
              - button "Guardar cambios" [ref=e206]
            - dialog "Nueva cita" [ref=e208]:
              - generic [ref=e209]:
                - heading "Nueva cita" [level=2] [ref=e210]
                - button "Cerrar" [ref=e211]:
                  - img [ref=e212]
              - generic [ref=e216]:
                - generic [ref=e217]:
                  - text: Título
                  - 'textbox "Ej: Consulta fiscal" [ref=e218]': Cita E2E Test
                - generic [ref=e219]:
                  - text: Cliente *
                  - textbox "Nombre del cliente" [ref=e220]: Cliente E2E
                - generic [ref=e221]:
                  - generic [ref=e222]:
                    - text: Email
                    - textbox "cliente@email.com" [ref=e223]
                  - generic [ref=e224]:
                    - text: Teléfono
                    - textbox "612345678" [ref=e225]
                - generic [ref=e226]:
                  - generic [ref=e227]:
                    - text: Fecha *
                    - textbox [ref=e228]
                  - generic [ref=e229]:
                    - text: Hora *
                    - textbox [ref=e230]
                  - generic [ref=e231]:
                    - text: Duración
                    - combobox [ref=e232]:
                      - option "15 min"
                      - option "30 min" [selected]
                      - option "45 min"
                      - option "60 min"
                      - option "90 min"
                - generic [ref=e233]:
                  - text: Descripción
                  - textbox "Notas adicionales..." [ref=e234]
                - generic [ref=e235]:
                  - button "Cancelar" [ref=e236]
                  - button "Crear cita" [disabled]:
                    - img
                    - text: Crear cita
  - alert [ref=e237]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Booking & Calendario', () => {
  4  |   test.use({ storageState: '.auth/admin.json' });
  5  | 
  6  |   test('admin calendario shows KPIs and config', async ({ page }) => {
  7  |     await page.goto('/admin/calendario');
  8  |     await expect(page.getByRole("heading", { name: "Calendario", exact: true })).toBeVisible();
  9  |     await expect(page.getByText('Configuración')).toBeVisible();
  10 |   });
  11 | 
  12 |   test('admin can create cita manually', async ({ page }) => {
  13 |     await page.goto('/admin/calendario');
  14 |     await page.getByText('Nueva cita').click();
  15 |     await page.fill('input[placeholder*="Consult"]', 'Cita E2E Test');
  16 |     await page.fill('input[placeholder="Nombre del cliente"]', 'Cliente E2E');
  17 |     // Set date to tomorrow
  18 |     const tomorrow = new Date();
  19 |     tomorrow.setDate(tomorrow.getDate() + 1);
  20 |     const dateStr = tomorrow.toISOString().split('T')[0];
  21 |     await page.fill('input[type="date"]', dateStr);
  22 |     await page.fill('input[type="time"]', '10:00');
> 23 |     await page.click('button:has-text("Crear cita")');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  24 |     await expect(page.getByText('Cita creada correctamente')).toBeVisible({ timeout: 5000 });
  25 |   });
  26 | });
  27 | 
  28 | test.describe('Public booking', () => {
  29 |   test('booking page loads with calendar', async ({ page }) => {
  30 |     await page.goto('/calendario');
  31 |     await expect(page.getByText('Agenda una cita')).toBeVisible();
  32 |   });
  33 | });
  34 | 
```