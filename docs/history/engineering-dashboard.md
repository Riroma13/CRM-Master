# Engineering Dashboard

> **Última actualización:** 2026-07-20
> **Este documento se actualiza automáticamente al archivar cada SPEC.**

---

## Overall Metrics

| Metric | Value |
|--------|-------|
| Total SPECs | 17 |
| Completed SPECs | 17 |
| Archived SPECs | 17 |
| Average Working Set Accuracy | **~98%** |
| Average Prediction Accuracy | **~96%** |
| Average Tests Added per SPEC | ~30 |
| Architecture Reviews Passed | 16/16 |
| Critical Discoveries | 0 |
| Major Discoveries | 0 |
| Minor Discoveries | 8 |
| Average Files Created per SPEC | ~26 |
| Average Files Modified per SPEC | ~3 |
| Unexpected Files | 17 |
| Unexpected Dependencies | 1 (cmdk) |
| Build Success | 16/16 |

---

## Timeline

| SPEC | Date | Working Set | Tests | Discoveries | Status |
|------|------|:-----------:|:-----:|:-----------:|--------|
| SPEC-0002 | 2026-07-04 | — | — | — | ✅ Archived |
| SPEC-0003 | 2026-07-19 | — | — | — | ✅ Archived |
| SPEC-0005 | 2026-07-19 | — | — | — | ✅ Archived |
| SPEC-0006 | 2026-07-19 | — | — | — | ✅ Archived |
| SPEC-0008 | 2026-07-18 | 100% | 19 | 0/0/0 | ✅ Archived |
| SPEC-0009 | 2026-07-19 | 100% | 19 | 0/0/0 | ✅ Archived |
| SPEC-0010 | 2026-07-19 | 90% | 20 | 0/0/2 | ✅ Archived |
| SPEC-0011 | 2026-07-20 | 100% | 14 | 0/0/1 | ✅ Archived |
| SPEC-0012 | 2026-07-20 | 98% | 32 | 0/0/1 | ✅ Archived |
| client-platform | 2026-07-18 | — | — | — | ✅ Archived |
| client-self-registration | 2026-07-19 | — | — | — | ✅ Archived |
| add-portalurl-to-findone | 2026-07-18 | 100% | — | 0/0/0 | ✅ Archived |
| SPEC-0015 | 2026-07-20 | 100% | 33 | 0/0/2 | ✅ Archived |
| SPEC-0016 | 2026-07-20 | ~95% | 35 | 0/0/1 | ✅ Archived |
| SPEC-0017 | 2026-07-20 | 100% | 24 | 0/0/0 | ✅ Archived |
| SPEC-0018 | 2026-07-20 | 100% | 83 | 0/0/0 | ✅ Archived |
| SPEC-0019 | 2026-07-20 | ~96% | 142 | 0/0/1 | ✅ Archived |

---

## Architecture Decisions Reused

| Decision | First introduced | Reused in |
|----------|----------------|-----------|
| SearchEngine abstraction | SPEC-0010 | — |
| Event-driven indexing | SPEC-0010 | SPEC-0011, SPEC-0012 |
| Shared contracts (`packages/shared/`) | SPEC-0009 | SPEC-0010, SPEC-0011, SPEC-0012 |
| Provider registry pattern | SPEC-0011 | SPEC-0012 |
| AutomationDispatcher | SPEC-0011 | — |
| SecretStore | SPEC-0011 | — |
| AiProvider abstraction | SPEC-0011 | — |
| PromptSanitizer | SPEC-0011 | — |
| CommunicationProvider | SPEC-0012 | — |
| ProviderSelectionStrategy | SPEC-0012 | — |
| SecureTemplateRenderer | SPEC-0012 | — |
| WorkflowEngine (Definition → Instance → Execution) | SPEC-0015 | — |
| NodeExecutor registry pattern | SPEC-0015 | — |
| ServiceTaskGateway contract | SPEC-0015 | — |
| Saga orchestrated compensation | SPEC-0015 | — |
| ParallelSplit + ParallelJoin | SPEC-0015 | — |
| SubWorkflow async suspend/resume | SPEC-0015 | — |
| NotificationCenter definition pattern (Definition → Instance → Routing → Delivery) | SPEC-0016 | — |
| Double-checkpoint preference evaluation | SPEC-0016 | — |
| SHA-256 hash chain per tenant (monotonic sequence) | SPEC-0018 | — |
| Append-only enforcement (middleware + trigger + roles) | SPEC-0018 | — |
| ComplianceRule + ExpectationRule interfaces | SPEC-0018 | — |
| Cryptographic redaction (GDPR) preserving hash chain | SPEC-0018 | — |
| Content snapshot on instance for immutability | SPEC-0016 | — |
| RoutingStrategy rule-based with override | SPEC-0016 | — |
| EAV table for notification preferences | SPEC-0016 | — |

---

## Lessons Trending

| Lesson | Appears in |
|--------|------------|
| Working Set prediction highly accurate | SPEC-0010, SPEC-0011, SPEC-0012 |
| Event-driven reduces coupling | SPEC-0010, SPEC-0011 |
| Shared contracts reduce drift | SPEC-0009, SPEC-0010, SPEC-0011, SPEC-0012 |
| Abstractions first prevent coupling | SPEC-0011, SPEC-0012 |
| Deferred tests follow consistent pattern | SPEC-0010, SPEC-0011, SPEC-0012 |
| Shared package re-exports must be in Working Set | SPEC-0015, SPEC-0016 |
| Implementation improves design proactively | SPEC-0015 |
| Doorbell tests catch tenant isolation gaps effectively | SPEC-0015 |
| Migration SQL fallback needed for CI-like environments | SPEC-0016 |
| Testing files should be predicted in Working Set or explicitly deferred | SPEC-0016 |
| Doorbell tests + backward compat essential for contract evolution | SPEC-0017 |
| Pre-existing build errors must be tracked independently of current PR scope | SPEC-0018 |
| Audit consumes should use convenience methods (log()) to avoid circular DI | SPEC-0018 |

---

## Current Platform Status

| Component | Status |
|-----------|--------|
| ADR | 0001–0008 ✅ |
| Platform Baseline | `sdd-v2.1-baseline` ✅ |
| Enterprise Design | ACTIVE ✅ |
| Feature Freeze | ACTIVE ✅ |
| Total archived SPECs | 17 |
| Pending SPECs | 2 (SPEC-0004, SPEC-0013) |
