# Plan 01 — Backend Infrastructure

> Depends on: `00-shared` (workspace must exist; `@mc/shared` types must be importable)  
> Unblocks: `03-api`  
> Parallel-safe with: `02-application`, `04-frontend`

---

## Scope

Implement the **infrastructure layer** of `packages/backend`. This layer owns all contact with external systems: MongoDB, AES-256-GCM crypto, and the raw Agenda job runner. It knows nothing about `application/` or `api/`.

See [`wiki/architecture.md`](../architecture.md) for the full layer rules.

---

## Layer position

```
         api/            ← plan 03
          │
          ▼
     application/        ← plan 02
          │
          ▼
   infrastructure/        ← THIS PLAN
```

---

## File Inventory

```
app/packages/backend/
├── .env.example
└── src/
    └── infrastructure/
        ├── mongodb/
        │   ├── client.ts                  ← getDb()
        │   ├── collections.ts             ← widgetsCol() / edgesCol()
        │   ├── mongo-widget-repository.ts ← implements IWidgetRepository
        │   └── mongo-edge-repository.ts   ← implements IEdgeRepository
        ├── crypto/
        │   └── index.ts                   ← encrypt() / decrypt()
        └── agenda/
            └── client.ts                  ← raw Agenda instance factory
```

---

## [NEW] `.env.example`

```
MONGODB_URI=mongodb://localhost:27017/mission-control
ENCRYPTION_KEY=<32-byte hex — generate with: openssl rand -hex 32>
PORT=3001
```

---

## [NEW] `src/infrastructure/mongodb/client.ts`

Plain MongoDB driver (`mongodb` package). Exports a `getDb()` function returning a cached `Db` instance. Connection is established once at startup and reused.

- Reads `MONGODB_URI` from `process.env`.
- Throws clearly if `MONGODB_URI` is not set.
- No imports from `application/` or `api/`.

---

## [NEW] `src/infrastructure/mongodb/collections.ts`

Typed collection accessors built on `getDb()`.

```ts
import type { Widget, Edge } from '@mc/shared';

export const widgetsCol = () =>
  getDb().collection<Omit<Widget, '_id'> & { _id: ObjectId }>('widgets');

export const edgesCol = () =>
  getDb().collection<Edge>('edges');
```

Only `MongoWidgetRepository` and `MongoEdgeRepository` may import from this file.

---

## [NEW] `src/infrastructure/mongodb/mongo-widget-repository.ts`

`MongoWidgetRepository implements IWidgetRepository`.

Constructor arguments (injected by `index.ts`):
- `col`: the widgets MongoDB collection
- `crypto`: `{ encrypt, decrypt }` from `infrastructure/crypto`

Responsibilities:
- `findAll()` — fetches all documents, decrypts `envVars[].value` before returning.
- `findById(id)` — fetches one document by `_id`, decrypts env vars.
- `create(data)` — encrypts `envVars[].value`, sets `timeoutMs: 10_000` default, inserts, returns the created `Widget`.
- `update(id, patch)` — re-encrypts `envVars` if present in the patch, applies `$set`, returns updated document.
- `delete(id)` — removes by `_id`.
- `saveResult(id, result, status)` — `$set`s `lastResult`, `status`, and `updatedAt` on the document.

Callers always receive plaintext env var values. Encryption is an internal detail of this class.

---

## [NEW] `src/infrastructure/mongodb/mongo-edge-repository.ts`

`MongoEdgeRepository implements IEdgeRepository`.

Constructor argument: `col` — the edges MongoDB collection.

- `findAll()` — returns all edge documents.
- `create(edge)` — inserts and returns the edge.
- `delete(id)` — removes the edge by `id` field.

---

## [NEW] `src/infrastructure/crypto/index.ts`

AES-256-GCM encryption using Bun's built-in `crypto` module (Web Crypto API).

Exports:
```ts
export function encrypt(plaintext: string): string;
export function decrypt(ciphertext: string): string;
```

- Key is read from `ENCRYPTION_KEY` env var (32-byte hex string).
- Each `encrypt` call generates a fresh random IV; the IV is prepended to the ciphertext (hex-encoded).
- `decrypt` reads the IV prefix and derives the plaintext.
- Both functions are pure and synchronous.

---

## [NEW] `src/infrastructure/agenda/client.ts`

Factory function that creates and returns a configured `Agenda` instance.

```ts
export function createAgenda(mongoUri: string): Agenda
```

- Connects Agenda to MongoDB at `mongoUri`.
- Sets `defaultLockLifetime` to 10 minutes.
- Does **not** define any job names or handlers — that is the responsibility of `application/scheduler-service.ts`.

---

## Verification

- `bun test src/infrastructure/crypto` — round-trip test: `decrypt(encrypt(s)) === s` for several inputs.
- Manually call `getDb()` and confirm a document round-trips through `MongoWidgetRepository.create` / `findById` with env vars encrypted in the DB and plaintext on the returned object.
