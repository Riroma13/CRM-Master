# client-self-service Specification

## Purpose

The authenticated client-facing portal. A logged-in `ClientUser` views and
manages its own appointments, shared documents, and profile. Every query is
scoped to the session's `clienteId` so one client can never see another client's
data, even within the same tenant.

## Requirements

### Requirement: Portal Dashboard

The system MUST serve a portal dashboard at `/portal` for authenticated clients
displaying KPIs scoped to `clienteId`: upcoming appointments and recent shared
documents. Unauthenticated access MUST redirect to `/login`.

#### Scenario: Authenticated client sees own KPIs

- GIVEN a client with 3 upcoming appointments and 2 shared documents
- WHEN the client loads `/portal` with a valid client session
- THEN the dashboard MUST render `upcomingAppointments = 3` and `recentDocuments = 2`

#### Scenario: Unauthenticated access redirects to login

- GIVEN no valid client session
- WHEN `/portal` is requested
- THEN the router MUST redirect to `/login`
- AND MUST NOT render any client KPI

### Requirement: My Appointments

`/portal/my-appointments` MUST list only appointments linked to the session
`clienteId`. A client MUST be able to view each and request cancellation.

#### Scenario: Client sees only own appointments

- GIVEN client A and client B each have appointments in the same tenant
- WHEN client A loads `/portal/my-appointments`
- THEN the list MUST contain only client A's appointments
- AND MUST NOT include any of client B's appointments

#### Scenario: Client cancels own appointment

- GIVEN a future appointment owned by the session client
- WHEN the client requests cancellation
- THEN the system MUST mark the appointment cancelled
- AND MUST NOT allow cancelling an appointment owned by another client

#### Scenario: Cancellation of past appointment rejected

- GIVEN an appointment in the past owned by the session client
- WHEN the client requests cancellation
- THEN the system MUST reject with an error
- AND the appointment status MUST remain unchanged

### Requirement: My Documents

`/portal/my-documents` MUST list only documents shared with the session
`clienteId`. Documents not shared with the client MUST NOT appear.

#### Scenario: Client views shared documents

- GIVEN 2 documents are shared with client A and 1 with client B
- WHEN client A loads `/portal/my-documents`
- THEN the list MUST show only the 2 documents shared with client A

#### Scenario: Unshared document inaccessible by direct URL

- GIVEN a document shared only with client B
- WHEN client A requests that document by id
- THEN the system MUST respond 403 or 404
- AND MUST NOT return document content

### Requirement: Profile View and Edit

`/portal/profile` MUST allow an authenticated client to view and edit a limited
set of basic contact fields. The client MUST NOT change `clienteId`, `tenantId`,
or `passwordHash` through this page.

#### Scenario: Client edits allowed profile field

- GIVEN an authenticated client
- WHEN the client updates an allowed field (e.g. phone)
- THEN the system MUST persist the change scoped to that client
- AND return 200 with the updated profile

#### Scenario: Client cannot edit restricted field

- GIVEN an authenticated client
- WHEN the client submits a payload containing `clienteId` or `tenantId`
- THEN the system MUST reject the field
- AND the original `clienteId`/`tenantId` MUST remain unchanged

### Requirement: ClienteId-Level Data Scoping

Every client-portal data query MUST pass through a Prisma client scoped by both
`tenantId` and `clienteId`, auto-injected. Handlers MUST NOT rely on manual
`where: { clienteId }` filters.

#### Scenario: Scoped client excludes other client's rows

- GIVEN clients A and B exist in tenant `acme`
- WHEN the scoped client for client A queries appointments
- THEN the result MUST contain only client A's rows
- AND client B's rows MUST NOT appear even if their ids are known