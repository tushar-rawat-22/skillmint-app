# Data Export

## Browser export

The current browser format is `skillmint-browser-export-v2` with contract `skillmint-browser-contract-v1`. It exports only registered values visible to the resolved current owner plus registered global preferences. Missing values and hidden other-owner partitions produce no record and reveal no owner identifier. One visible corrupt, future-version, unsupported, or contract-invalid value fails the whole export.

The registry is validated against the per-key export contracts before storage reads. Raw values are captured once per descriptor, reconstructed by the owning contract, serialized once, and reread for exact raw-value equality. Records are deterministic by key. The manifest states that browser storage was read and verified sequentially; it is not an atomic point-in-time transactional snapshot, and change-then-change-back races are not detectable.

Privacy transformations are explicit and contract-specific. They exclude known sync messages, ownership/database references, unsafe JD identifiers, feedback `syncError`, and feedback query/fragment or absolute-origin data where applicable. The engine does not recursively sanitize arbitrary user text. Account IDs and storage envelope metadata are not exported. The file is named `skillmint-browser-{anonymous|account}-YYYY-MM-DD.json` and includes a final newline in its size guard.

## Account export

The current account format is `skillmint-account-export-v4` with contract `skillmint-account-contract-v3`. The UI supplies its captured expected account ID, and the collector verifies exact authenticated identity before collection, between table collectors, and immediately before return. Ownership IDs are used for queries and validation but excluded from the JSON.

The export allowlists profiles, resume analyses, the Workspace-resume selection, JD matches, beta feedback, the account persona, and candidate Proof Briefs. Feedback moderation `status` is not exported. Proof Brief token hashes are never exported; the derived brief payload, visibility, source-analysis reference, and lifecycle timestamps are included. `career_snapshots` is intentionally count-only: a zero count produces an explicit empty array; any nonzero count blocks the entire export as an unsupported data contract. Keyset-paginated tables use ascending UUID IDs, conservative row/page/total/byte guards, duplicate detection, strictly increasing cursors, and pre/post count reconciliation. Profile, Workspace-selection, and persona cardinality are independently zero-or-one.

The Workspace selection uses no pagination and exports only `resume_analysis_id` and the database-controlled `selected_at`; `user_id` remains validation-only. Collection occurs after the complete owned resume-analysis history. A selection whose source analysis is absent from that complete successful collection fails the whole export rather than falling back to the latest row or returning an unreconciled pointer.

Proof Brief collection follows the same source-integrity rule. If a brief points
to an analysis that is absent from the complete owned resume collection, the
whole export fails. This prevents an apparently complete export from carrying
an orphaned sharing record.

Collectors use separate authenticated requests. Stable observed counts do not prove a complete historical provider export or an atomic point-in-time transactional snapshot; concurrent changes can remain undetected. Any identity, query, count, contract, pagination, serialization, or size failure returns no partial JSON.

## Download boundary

Both paths pass the exact generated filename and JSON string to the download helper. A success means one browser download click was requested. It does not prove that the browser saved a file or that the download completed. The helper creates one Blob and one object URL, clicks at most once, removes the temporary anchor, and schedules URL revocation after a successful click request. Blocked downloads remain a browser/manual-QA concern.

The Phase 1A local database gate proved the V8 selection table, owner-qualified constraints, RLS/ACL shape, lifecycle behavior, and local generated-type provenance. Offline fixtures and local database proof still do not prove a hosted catalog, Production behavior, browser file-save completion, legal compliance, or production readiness.
