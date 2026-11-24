# 0004. Storage for uploaded delivery notes exports

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

Users upload a day's remitos export to the backend (`POST /delivery-notes`) and later read it back (`GET /delivery-notes/:id`). For now, exports are kept as local files. Later they will probably go in a database. The rest of the backend shouldn't change when that happens.

## Decision

- **Two small interfaces, injected by token.** `DeliveryNotesService` uses only TypeScript interfaces and receives the implementations through `@Inject(TOKEN)`:
  - `DeliveryNotesStorage` (`DELIVERY_NOTES_STORAGE`) decides where exports are kept: `save(content) → id` and `read(id) → content | null`. It stores the raw bytes exactly as uploaded.
  - `DeliveryNotesReader` (`DELIVERY_NOTES_READER`) decides how an export's content becomes delivery notes: `read(content) → records`. It throws `InvalidDeliveryNotesExportError` when the content can't be read.
- **One module per implementation, picked in `DeliveryNotesModule`'s `imports`.** Each implementation module provides and exports its token:
  - `LocalFileDeliveryNotesStorageModule` writes `<id>.json` files to `DELIVERY_NOTES_DIR`, which defaults to `./uploads` in the working directory.
  - `JsonDeliveryNotesReaderModule` reads LogiSur's UTF-8 JSON array of objects.

  To switch, import a different module, for example a database storage or a reader for another format or source. Tests override a token, such as pointing storage at a temporary directory.
- **Ids are v4 UUIDs.** The API never sees a storage detail like `.json`. `GET /delivery-notes/:id` checks the id with `@IsUUID('4')` and answers 400 otherwise. The local storage also accepts only UUIDs, so no id can name a path.
- **An upload is read before it's stored.** If the reader rejects it, the API answers 422 and nothing is stored. Records aren't filtered, cleaned or deduplicated on upload.
- **Services don't know about HTTP.** They throw `ApplicationError` kinds: `NotFoundError` or `UnprocessableContentError`. `ApplicationErrorFilter` translates them into Nest's HTTP exceptions (404 and 422) and hands them to Nest's built-in exception filter. All other errors are left to Nest's default handler. Request input is validated by a global `ValidationPipe` against class-validator DTOs.

## Alternatives considered

- **Writing uploads into `REMITOS_DIR` (`data/`):** rejected. That folder holds read-only input fixtures, and Docker mounts it read-only.
- **Keeping the uploader's file name as the id:** rejected. Re-uploading would overwrite the earlier file, and the name would come from the client. Ids are generated instead.
- **An abstract class as both contract and token:** rejected. Interfaces keep the contracts minimal and type-only, and explicit tokens make the binding visible.
- **Parsing inside the service:** rejected. Exports may arrive in other ways or formats, so reading is its own contract, like storage.
- **A hand-written catch-all exception filter:** rejected. It would duplicate what Nest's built-in filter already does.

## Consequences

- A database storage, or a new export format, only needs a class that implements the interface, a module that provides its token, and a change to `DeliveryNotesModule`'s `imports`. The controller and service stay as they are.
- In Docker, uploads live in the named volume `delivery-notes`, so they survive rebuilds. `docker compose down -v` deletes them.
- Open: storing metadata (original file name, upload time) and listing uploads.
