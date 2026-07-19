# shared-ui Specification

## Purpose

A reusable component package (`packages/ui`) shared across the admin and tenant
frontends. It extracts the four primitives already duplicated in `admin-web` so
both `apps/admin-web` and `apps/tenant-web` consume one implementation, reducing
drift and bundle size.

## Requirements

### Requirement: Package Exports Four Primitives

`packages/ui` MUST export `Button`, `Card`, `Badge`, and `Layout` primitives.
Each primitive MUST accept a stable, documented prop API and MUST render without
requiring a provider beyond standard Tailwind context.

#### Scenario: Consumer imports render primitives

- GIVEN `packages/ui` is built
- WHEN a consumer imports `{ Button, Card, Badge, Layout }` from `packages/ui`
- THEN each import MUST resolve to a renderable React component
- AND importing a non-exported name MUST fail to compile

#### Scenario: Prop API stays backward compatible

- GIVEN a consumer renders `<Button variant="primary">Save</Button>`
- WHEN `packages/ui` releases a new version
- THEN the existing usage MUST keep rendering without modification
- AND new props MUST be optional

### Requirement: Consumed by Both Frontends

`apps/admin-web` and `apps/tenant-web` MUST declare `packages/ui` as a workspace
dependency and MUST source `Button`, `Card`, `Badge`, and `Layout` from it. The
`admin-web` local copies of these primitives MUST be removed and re-exported from
`packages/ui` to avoid duplicate implementations.

#### Scenario: admin-web imports from packages/ui

- GIVEN `packages/ui` exports the four primitives
- WHEN `apps/admin-web` renders a Button
- THEN the rendered Button MUST come from `packages/ui`
- AND the local `apps/admin-web/src/components/Button` copy MUST no longer exist

#### Scenario: tenant-web imports the same package

- GIVEN `packages/ui` exports the four primitives
- WHEN `apps/tenant-web` imports `Card`
- THEN the import MUST resolve to the same implementation used by `admin-web`

### Requirement: Tree-Shakeable Bundle

`packages/ui` MUST ship ESM with side-effects free module flags so unused
primitives are eliminated from each consumer's production bundle.

#### Scenario: Unused primitive is dropped from bundle

- GIVEN `apps/tenant-web` imports only `Button` and `Card`
- WHEN the production bundle is built
- THEN the bundle MUST NOT contain `Badge` or `Layout` code
- AND the build size MUST be smaller than importing the whole package

### Requirement: Visual Consistency

Primitives MUST render identically across both consumers given the same props,
relying on the shared Tailwind configuration. Visual drift between apps for the
same component and props MUST be treated as a defect.

#### Scenario: Same props render same markup

- GIVEN `<Button variant="primary" size="md">OK</Button>` rendered in both apps
- WHEN the rendered HTML is compared
- THEN the class set and DOM structure MUST match
- AND a snapshot regression MUST fail on divergence