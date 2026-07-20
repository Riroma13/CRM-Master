# SPEC-0017 Migration Plan: Activity Timeline Async Migration

## Current State

The `ActivityTimelineService.publish()` method is **synchronous** (deprecated):
- Same signature since MVP
- Internally enqueues to BullMQ and returns `Promise<void>`
- Does not require or return an `eventId`
- No deduplication guarantee
- 12+ consumer modules call this method

## Target State

The `ActivityTimelineService.publishAsync()` method is the **preferred async path**:
- Requires `eventId` in the envelope
- Returns `Promise<{ eventId: string }>`
- Full deduplication via `eventId` unique constraint
- All new modules MUST use `publishAsync()`

## Timeline

| Phase | Timing | Description |
|-------|--------|-------------|
| **Deprecation** | MVP+1 | `publish()` marked `@deprecated`. `publishAsync()` added. Consumer modules unchanged. |
| **Migration** | MVP+3 → MVP+5 | Migrate each consumer module from `publish()` to `publishAsync()`. One module per PR. |
| **Removal** | MVP+6 | Remove `publish()` wrapper. Only `publishAsync()` remains. Make `eventId` required in envelope. |

## Migration Steps per Consumer Module

Each consumer module follows the same pattern:

```typescript
// BEFORE (deprecated)
await this.activityTimeline.publish(envelope);

// AFTER (preferred)
await this.activityTimeline.publishAsync({
  ...envelope,
  eventId: randomUUID(), // or a deterministic ID
});
```

### Module Migration Order

| Order | Module | PR | Status |
|-------|--------|----|--------|
| 1 | `auth` | PR-XXX | Pending |
| 2 | `client-auth` | PR-XXX | Pending |
| 3 | `clients` | PR-XXX | Pending |
| 4 | `citas` | PR-XXX | Pending |
| 5 | `documentos` | PR-XXX | Pending |
| 6 | `eventos` | PR-XXX | Pending |
| 7 | `notifications` | PR-XXX | Pending |
| 8 | `tenant-automations` | PR-XXX | Pending |
| 9 | `tenant-incidencias` | PR-XXX | Pending |
| 10 | `tenant-pagos` | PR-XXX | Pending |
| 11 | `tenant-presupuestos` | PR-XXX | Pending |
| 12 | `tenant-sistemas` | PR-XXX | Pending |

## Breaking Changes

When `publish()` is removed at MVP+6:

1. **`eventId` becomes required** in `ActivityEventEnvelope`
2. All callers MUST provide a UUID `eventId`
3. The `ActivityEventEnvelopeSchema` will make `eventId` required (`.uuid()` without `.optional()`)
4. Any caller still using `publish()` will fail to compile

## Rollback Plan

If a migrated module has issues:

1. Revert the module's PR to use `publish()` again
2. `publish()` is still functional (just deprecated)
3. File a bug, fix, re-deploy

## Compatibility Layer (MVP+1 → MVP+6)

The compatibility layer ensures zero breakage during the migration window:

- `publish()` delegates to BullMQ (same as `publishAsync()` but without requiring `eventId`)
- If no `eventId` is provided, one is auto-generated in the processor
- Both methods coexist. No module is forced to migrate immediately.

## Notes

- The enricher pipeline runs after persistence regardless of which method is used
- Full-text search, cursor pagination, and enrichment are available to all events
- No data migration required: existing events have `eventId = NULL` and work as before
