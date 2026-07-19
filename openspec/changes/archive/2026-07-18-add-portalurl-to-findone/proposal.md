# Proposal: Add `portalUrl` to `TenantsService.findOne()`

## Intent

`TenantsService.create()` returns `portalUrl: \`https://${slug}.crmmaster.com\`` so admins can immediately share the link. `findOne()` returns the same tenant record **without** that field, so admin tools (Mission Control detail view, support flows) cannot display or link to the portal without re-deriving the URL client-side. This change closes that inconsistency.

## Scope

### In Scope
- Add `portalUrl: \`https://${tenant.slug}.crmmaster.com\`` to the response object in `TenantsService.findOne()` (`apps/api/src/modules/tenants/tenants.service.ts`).

### Out of Scope
- No schema, endpoints, or auth changes.
- No new test files; no edits to existing tests.
- No changes to `findAll()` (same gap — see Notes).
- No refactor of the hardcoded `crmmaster.com` (existing tech debt in `create()` too).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. No `tenants`/`tenant-management` capability exists in `openspec/specs/`; the closest is `tenant-isolation`, which covers routing, not response shape. This is an internal API consistency fix — the spec layer is unchanged.

## Approach

Mirror the exact pattern already used in `create()` (same file, line 142):

```ts
return {
  id: tenant.id,
  slug: tenant.slug,
  // ...existing fields...
  portalUrl: `https://${tenant.slug}.crmmaster.com`,
  // ...
};
```

Additive only — no field removed or renamed, so existing consumers are unaffected.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/modules/tenants/tenants.service.ts` | Modified | One field added to `findOne()` return. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing test pins exact response shape | Low | Additive change; existing tests assert presence, not full shape. If one fails, add the field to its expected object (one line). |
| Hardcoded `crmmaster.com` | Low | Matches `create()` pattern; env-var extraction is a separate refactor. |
| Inactive tenants get a portalUrl | Low | Intentional — the URL is a property of the slug, not activation state. Matches `create()`. |

## Rollback Plan

Revert the one added line. No data migration, no cache flush, no downstream consumer depends on the new field.

## Dependencies

None.

## Success Criteria

- [ ] `findOne()` response includes `portalUrl` for every returned tenant.
- [ ] `pnpm test` passes.
- [ ] `pnpm lint` passes.
- [ ] No other method in `tenants.service.ts` is modified.

## Notes (not part of the change)

- `findAll()` (line 176) has the same gap. Out of scope per user direction, worth a follow-up ticket.
- `openspec/config.yaml` declares `strict_tdd: true`, but the user explicitly excluded test changes. Honored because the change is additive and existing tests do not pin full response shape.
- No design phase needed: one-line additive change, no architectural impact.
