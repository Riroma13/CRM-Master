# ADR-0008 — Communication Platform

- **Número ADR:** ADR-0008
- **Fecha:** 2026-07-20
- **Autor:** Sistema
- **Estado:** Proposed

---

## 1. Contexto

CRM-Master carece de un sistema de comunicaciones unificado. Cada canal se
implementa ad-hoc. No existe historial centralizado, plantillas reutilizables,
ni abstracción común para que Automation Hub (SPEC-0011) envíe comunicaciones
sin conocer proveedores concretos.

## 2. Decisión

> **Decidimos** implementar Communication Platform con arquitectura de canales
> y proveedores desacoplados, **porque** sigue el mismo patrón de abstracciones
> validado en SPEC-0011 (AiProvider, ProviderRegistry), **aceptando que** los
> proveedores externos (SendGrid, Twilio) tienen APIs y mecanismos de firma
> diferentes que deben ser encapsulados por cada provider.

### Abstracciones aprobadas

| Abstracción | Propósito |
|-------------|-----------|
| `CommunicationProvider` | Interfaz que todo proveedor implementa. Incluye `verifyWebhookSignature()`. |
| `ProviderSelectionStrategy` | Selecciona primary/fallback provider por canal. |
| `ChannelProviderConfigStore` | Almacena configuración de proveedores por tenant. |
| `DeliveryQueue` | Desacopla el envío de la respuesta HTTP. |
| `SecureTemplateRenderer` | Renderiza plantillas sin acceso a prototipos. |
| `ChannelOutputSanitizer` | Sanitización específica por canal. |
| `RateLimiter` | Rate limiting por (tenantId, providerId). |

## 3. Consecuencias

- Providers desacoplados del engine. OCP real.
- Webhook signatures validadas por cada provider.
- Rate limiting justo entre tenants.
- Templates seguros sin acceso a prototipos.

## 4. Referencias

- `openspec/changes/SPEC-0012-communication-platform/design.md`
- ADR-0004: SDD Feature Freeze
- ADR-0007: AI Automation Hub
