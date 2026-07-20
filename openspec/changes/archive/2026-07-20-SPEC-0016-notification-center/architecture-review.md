# Architecture Review — SPEC-0016: Notification Center

## Findings

| # | Severity | Topic | Finding | Effort | Recommendation |
|---|----------|-------|---------|--------|----------------|
| 1 | 🔴 Blocking | Cross-SPEC dependency | **SPEC-0012 `CommunicationProvider.send()` does not support `idempotencyKey`.** The design marks this as "Baja probability" risk (line 246), but the current `SendMessageInput` interface in `packages/shared/src/communication/provider.interface.ts` simply has no `idempotencyKey` field. Delivery deduplication cannot work without it — BullMQ retries would create duplicate external deliveries (emails, SMS) with no way for SPEC-0012 to deduplicate. | ~3 days | Add `idempotencyKey?: string` to `SendMessageInput` in SPEC-0012 shared contract BEFORE or AS PART OF this SPEC. This is a cross-SPEC change that affects both designs. Alternatively, use `messageId` as the deduplication mechanism within SPEC-0012 if the provider layer already supports it — document this explicitly. |
| 2 | 🔴 Blocking | Preference evaluation timing | **Contradiction between Data Flow and Risk section.** The Data Flow (line 109) evaluates preferences at **creation time** ("DISABLED → CANCELLED, stop"), but Risk section (line 248) says "notificaciones programadas respetan las preferencias AL momento de envío." If preferences are checked only at creation time, changing quiet hours or disabling a category after notification creation has ZERO effect on already-QUEUED/SCHEDULED instances. If checked at send time, the Routing Engine must re-evaluate at delivery — which the Data Flow doesn't show. This is also a Ux problem: a user who disables "email" expects in-flight notifications to respect that immediately. | ~2 days | **Define a single evaluation point**: (a) at creation for instant decisions, (b) at delivery for already-scheduled instances. The Routing Engine must re-evaluate preferences during delivery, not just at creation. Show this in the Data Flow. A `preferencesLastCheckedAt` field on the instance helps audit this. |
| 3 | 🟡 High | SPEC-0015 integration gap | **How the Workflow Engine (SPEC-0015) triggers notifications is undefined.** SPEC-0015's `UserTask` creates human approval tasks. SPEC-0016 says "Workflow triggers → initiates notifications" (line 293) but neither design specifies the contract. Does SPEC-0015 call `POST /api/v1/notifications`? Through `ServiceTaskGateway`? Through a direct API call? If through `ServiceTaskGateway`, the Notification Center must implement a `ServiceTask` that SPEC-0015 can call — but SPEC-0016's contracts don't mention this. If directly via REST, SPEC-0015 bypasses the internal contract layer. | ~2 days | Add a `NotifyServiceTask` action or clarify the integration contract: SPEC-0015's UserTask executor calls SPEC-0016's `createNotification()` — either via a dedicated method on a shared interface or via REST. Document this in BOTH designs. |
| 4 | 🟡 High | Definition versioning | **`NotificationDefinition` lacks a versioning table.** SPEC-0015 uses `WorkflowDefinitionVersion` (separate table, multiple versions per definition). SPEC-0016 has only `version: Int` on the same table. If a definition is updated (e.g., `template` changes), old instances referencing it via `definitionId` will see the new template content — breaking immutability commitment (line 89: "notificaciones en curso no deben cambiar"). | ~3 days | Follow SPEC-0015's pattern: extract `NotificationDefinitionVersion` into a separate table. Or store a snapshot of the resolved definition at instance creation time in `NotificationInstance` metadata. |
| 5 | 🟡 High | Receipt cascade vs audit retention | **`NotificationReceipt` has `onDelete: Cascade`** (Prisma model, line 620). When `NotificationInstance` is deleted after 30-day retention, all receipts are cascade-deleted. But delivery receipts are critical for compliance (audit trail says 1 year retention, line 351). Evidence of delivery could be destroyed before its retention window. | ~2 days | Remove `onDelete: Cascade` from receipts, or extend instance retention to match receipt requirements. Create a separate archive table for receipts that survives instance deletion. |
| 6 | 🟡 High | Partitioning overhead at 10M/day | **Daily partitioning for instances + audit creates 365 partitions/year.** Each partition carries 4 indexes for instances, 2 for audit. At 10M/day (~100GB/day), individual partition operations (VACUUM, reindex, archive) become heavy operations. PostgreSQL partition management (detach, drop) at daily granularity adds operational complexity. | ~1 day | Switch to **weekly partitioning** for instances and **monthly partitioning** for audit. Daily partitioning adds operational overhead disproportionate to query performance gains given the existing composite indexes. |
| 7 | 🟢 Nice | Batching window race condition | **Notification created between window close and batch job execution may be orphaned.** If `NotificationBatch.windowEnd` passes but the batch job hasn't run yet, a new notification created in this gap won't belong to the closed batch. If the batch job's query uses `createdAt < windowEnd`, the notification is missed; if it uses `createdAt <= now()`, it could be included in a "closed" batch. | ~1 day | Use `batchKey` + `windowEnd` NOT `createdAt` for batch membership. Or use a "pending" batch window that stays open until the job marks it closed atomically. |
| 8 | 🟢 Nice | Preference uniqueness gap | **`@@unique([tenantId, userId, category])` allows duplicate global preferences.** With `category?: string`, `null` = global default. But there's no `@@unique([tenantId, userId])` for the `category = null` case. A user could receive multiple global preference rows, and query behavior becomes non-deterministic. | ~0.5 days | Add `@@unique([tenantId, userId])` filter (PostgreSQL partial unique index) to prevent duplicate global preferences. Or use a GLOBAL sentinel value instead of nullable. |
| 9 | 🟢 Nice | Batch isolation across tenants | **`batchKey` (e.g., "digest:daily:user-123") doesn't include `tenantId`.** Tenant A user 123 and Tenant B user 123 would share the same batchKey. While `NotificationBatch` has `tenantId` column, the key generation could cause collision in batch membership queries or cache lookups. | ~0.5 days | Prefix `batchKey` with `tenantId`, e.g., `{tenantId}:daily:{userId}`. This is a single-line change with no data migration cost. |
| 10 | 🟢 Nice | RoutingStrategy implementation location undefined | **The `RoutingStrategy` interface is clean OCP** (line 481). But where do alternative implementations live? Same module? Different module? Plugin system? The design assumes extensions through DI registration but doesn't specify the pattern. Same for `BatchPolicy`. | ~1 day | Document the extension pattern: register via `ModuleRef` or custom `RouterStrategyRegistry` similar to SPEC-0015's `NodeExecutorRegistry`. This prevents ad-hoc registrations later. |

## Risks

- **SPEC-0012 integration blocked until `idempotencyKey` is added**: The entire delivery path depends on SPEC-0012 supporting idempotent sends. Without it, every BullMQ retry creates a real external delivery attempt — email duplicates, SMS duplicates, etc. Marketing/Security impact is real.
- **Preference contradictions create a poor UX failure mode**: A user who configures quiet hours or disables a channel expects IMMEDIATE effect. If the system only checks at creation, the user will perceive a bug ("I disabled email but still got 5 emails"). This erodes trust.
- **SPEC-0015/0016 integration NOT designed yet**: Both SPECs are being designed independently but MUST integrate. The UserTask → Notification path is critical for UX. Without a defined contract, the first implementation will create accidental coupling.
- **Retention compliance blind spot**: If `onDelete: Cascade` destroys receipts before audit retention expires, the system cannot prove delivery for compliance audits. This is a legal risk depending on industry (healthcare, finance, etc.).
- **Definition immutability not guaranteed**: Without versioned definitions or content snapshots, updating a definition retroactively changes the content of ALL historical notifications referencing it.

## Verdict

**Architecture Verdict:** APPROVED WITH CONDITIONS

**Conditions:**
1. Resolve `idempotencyKey` gap in SPEC-0012's `CommunicationProvider.send()` **before** delivery integration begins. Add `idempotencyKey?: string` to `SendMessageInput`. This is a cross-SPEC prerequisite and belongs in the Design phase of this SPEC (or SPEC-0012's).
2. Fix the preference evaluation timing contradiction: document a single evaluation policy (recommendation: at creation for routing, re-validate at delivery for quiet hours). Update the Data Flow to reflect both checkpoints.
3. Define the SPEC-0015 ↔ SPEC-0016 integration contract for Workflow Engine UserTask notifications before applying. Minimum: how does SPEC-0015 call SPEC-0016? Via `ServiceTaskGateway` or direct REST? Document in both designs.
4. Remove `onDelete: Cascade` from `NotificationReceipt` or extend `NotificationInstance` retention to match receipt compliance requirements (at minimum 1 year for receipts, or archive receipts separately).
5. Adopt the versioned definition pattern (separate version table or content snapshot) to honor the immutability commitment.

**Rationale:**

The architectural boundaries (Definition → Instance → Routing → Batching → Delivery) are sound. The separation of concerns between SPEC-0016 (decision logic) and SPEC-0012 (delivery execution) is clean and follows the established pattern from SPEC-0015. OCP holds for `RoutingStrategy`, `BatchPolicy`, and channel extensions. Multi-tenant isolation is properly scoped at every level.

However, three issues are structural enough to block safe implementation:
- The `idempotencyKey` gap is not a risk assessment error — it's a factual missing field in a contract that this SPEC depends on. Low probability classifications don't apply to verifiable absences.
- The preference evaluation timing contradiction will produce observable incorrect behavior (scheduled notifications ignoring user preference changes).
- Receipt cascade deletion creates a compliance blind spot.

These are all fixable in a design refinement pass before tasks are generated. The architecture itself doesn't need to be redone.

---

## Related Artifacts

- [design.md](design.md)
- [tasks.md](tasks.md)
- [verify-report.md](verify-report.md)
- [archive-report.md](archive-report.md)
- [architecture-decisions.md](architecture-decisions.md)
- [pr-description.md](pr-description.md)
