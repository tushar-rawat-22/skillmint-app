# Data Export

## Browser export

The current browser format is `skillmint-browser-export-v2` with contract `skillmint-browser-contract-v1`. It exports only registered values visible to the resolved current owner plus registered global preferences. Missing values and hidden other-owner partitions produce no record and reveal no owner identifier. One visible corrupt, future-version, unsupported, or contract-invalid value fails the whole export.

The registry is validated against the per-key export contracts before storage reads. Raw values are captured once per descriptor, reconstructed by the owning contract, serialized once, and reread for exact raw-value equality. Records are deterministic by key. The manifest states that browser storage was read and verified sequentially; it is not an atomic point-in-time transactional snapshot, and change-then-change-back races are not detectable.

Privacy transformations are explicit and contract-specific. They exclude known sync messages, ownership/database references, unsafe JD identifiers, feedback `syncError`, and feedback query/fragment or absolute-origin data where applicable. The engine does not recursively sanitize arbitrary user text. Account IDs and storage envelope metadata are not exported. The file is named `skillmint-browser-{anonymous|account}-YYYY-MM-DD.json` and includes a final newline in its size guard.

## Account export

The current account format is `skillmint-account-export-v2` with contract `skillmint-account-contract-v1`. The UI supplies its captured expected account ID, and the collector verifies exact authenticated identity before collection, between table collectors, and immediately before return. Ownership IDs are used for queries and validation but excluded from the JSON.

The export allowlists profiles, resume analyses, JD matches, and beta feedback. Feedback moderation `status` is not exported. `career_snapshots` is intentionally count-only: a zero count produces an explicit empty array; any nonzero count blocks the entire export as an unsupported data contract. Keyset-paginated tables use ascending UUID IDs, conservative row/page/total/byte guards, duplicate detection, strictly increasing cursors, and pre/post count reconciliation. Profile cardinality is zero-or-one.

Collectors use separate authenticated requests. Stable observed counts do not prove a complete historical provider export or an atomic point-in-time transactional snapshot; concurrent changes can remain undetected. Any identity, query, count, contract, pagination, serialization, or size failure returns no partial JSON.

## Download boundary

Both paths pass the exact generated filename and JSON string to the download helper. A success means one browser download click was requested. It does not prove that the browser saved a file or that the download completed. The helper creates one Blob and one object URL, clicks at most once, removes the temporary anchor, and schedules URL revocation after a successful click request. Blocked downloads remain a browser/manual-QA concern.

Offline fixtures do not prove live Supabase rows, live RLS, indexes, browser save behavior, legal compliance, or production readiness.
