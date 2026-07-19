# client-auth Specification

## Purpose

Authentication for end customers (the `Cliente` entity) that is distinct from the
tenant admin auth flow. Clients log in on `{slug}.crmmaster.com/login`, receive a
Better-Auth JWT in an HttpOnly cookie, and are dispatched to a client portal. The
admin session and client session are never interchangeable.

## Requirements

### Requirement: Client Login Endpoint

The system MUST expose `POST /api/v1/client/auth/login` accepting
`{ email, password }`. The endpoint MUST resolve the tenant from the `Host`
subdomain, look up the `ClientUser` by `(tenantId, email)`, bcrypt-verify the
password, and on success issue a Better-Auth JWT written to the HttpOnly cookie
`__Secure-client-session`. The JWT claims MUST include
`{ sub, clienteId, tenantId, role: 'client' }`.

#### Scenario: Valid credentials return session cookie

- GIVEN an active `ClientUser` for tenant `acme` with a known password
- WHEN `POST /api/v1/client/auth/login` with that email and password on `Host: acme.crmmaster.com`
- THEN the API MUST respond 200
- AND MUST set `__Secure-client-session` HttpOnly, Secure cookie containing a JWT with `role: 'client'`

#### Scenario: Wrong password returns 401

- GIVEN an active `ClientUser` exists
- WHEN login is attempted with an incorrect password
- THEN the API MUST respond 401
- AND MUST NOT set any session cookie

#### Scenario: Unknown tenant subdomain returns 404

- GIVEN no tenant resolves for the request `Host`
- WHEN `POST /api/v1/client/auth/login` is called
- THEN the API MUST respond 404
- AND MUST NOT leak whether the email exists

#### Scenario: Deactivated ClientUser returns 403

- GIVEN a `ClientUser` with `isActive = false`
- WHEN login is attempted with valid credentials
- THEN the API MUST respond 403
- AND MUST NOT issue a session cookie

### Requirement: Client Logout Endpoint

`POST /api/v1/client/auth/logout` MUST clear the `__Secure-client-session` cookie
and revoke the Better-Auth session server-side.

#### Scenario: Logout clears the cookie

- GIVEN a client holds a valid session cookie
- WHEN `POST /api/v1/client/auth/logout` is called
- THEN the API MUST respond 200
- AND the `Set-Cookie` response MUST expire the session cookie

### Requirement: Client Session Retrieval

`GET /api/v1/client/me` MUST return `{ clientUser, cliente }` for a valid client
session. The `passwordHash` field MUST NOT appear in any response.

#### Scenario: Authenticated client receives own profile

- GIVEN a valid client session cookie
- WHEN `GET /api/v1/client/me` is called
- THEN the API MUST respond 200 with `{ clientUser, cliente }`
- AND neither object MUST contain `passwordHash`

#### Scenario: Missing or invalid cookie returns 401

- GIVEN no `__Secure-client-session` cookie is sent
- WHEN `GET /api/v1/client/me` is called
- THEN the API MUST respond 401

### Requirement: Role-Based Login Dispatch

After successful login, the frontend router MUST dispatch by authenticated role:
`User.role === 'admin'` redirects to `/admin`; a `ClientUser` redirects to
`/portal`. The middleware MUST NOT hand a client token to admin routes or vice
versa.

#### Scenario: Admin login routes to /admin

- GIVEN an admin `User` authenticates successfully
- WHEN the unified login dispatches
- THEN the router MUST redirect to `/admin`
- AND MUST NOT redirect to `/portal`

#### Scenario: Client login routes to /portal

- GIVEN a `ClientUser` authenticates successfully
- WHEN the unified login dispatches
- THEN the router MUST redirect to `/portal`
- AND MUST NOT redirect to `/admin`

### Requirement: Client Guard Rejects Wrong Token Type

A `ClientAuthGuard` MUST protect client-scope endpoints. It MUST reject requests
carrying an admin session cookie and accept only a valid `__Secure-client-session`
with `role: 'client'`.

#### Scenario: Admin cookie cannot access client endpoint

- GIVEN a request carries an admin session cookie instead of the client cookie
- WHEN it calls any `/api/v1/client/**` route protected by `ClientAuthGuard`
- THEN the guard MUST reject with 401 or 403
- AND MUST NOT process the request as a client