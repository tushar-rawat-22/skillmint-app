# Version 2 Resume Progress and Comparison Architecture

**Status:** Phase 2 Core and UI are committed locally; Phase 2B is a local
closure candidate pending acceptance, commit, push, independent review, checks,
and merge.

**Accepted Core:** `02501543fdb39a7ad51d08a29adb15a175844f15`

**Accepted UI:** `4f777b0e149bb148319c4c38cd1e9cb51d91e4e8`

## Objective and truth boundary

Resume comparison helps a signed-in person inspect differences in evidence
detected in exactly two explicitly chosen saved reports. Source A and Source B
retain caller order. The result is evidence-only: it does not recalculate a
score, infer that a person gained or lost a skill, or produce a Career IQ, ATS,
Proof Confidence, role-fit, employability, recommendation, or hiring forecast
delta. A difference between stored results is not causal proof.

The comparison is derived at request time and is not persisted. It creates no
comparison-history row, export record, browser-storage record, URL state,
analytics event, Workspace selection, browser-active report, or resume-sync
change. Existing saved-report export, deletion, protected account deletion, and
browser data controls retain their separate contracts.

## Explicit selection and bounded history

The page lists the current account's saved reports through bounded ten-item
cursor pages. Source selection and the back-cursor stack live only in React
memory. Neither selected identifier is written to a query parameter, fragment,
local storage, session storage, IndexedDB, or another browser key.

Compare and Refresh refetch the exact two selected identifiers as an
owner-qualified pair. They do not substitute the latest saved report, the
account Workspace selection, or the browser-active report. The repository also
requires two different valid identifiers and returns the pair in explicit
Source A then Source B order.

History ordering preserves PostgreSQL timestamps through a strict parser and a
microsecond `BigInt` ordering key, with ascending UUID as the deterministic
tie-breaker. Cursor validation and ordering therefore do not collapse distinct
PostgreSQL microseconds into JavaScript millisecond precision.

## Projection and evidence handling

The pair query uses a narrow JSON-path projection for the permitted comparison
inputs: source identity and saved time, skill groups, project/experience/
certification counts, recognized link-category presence, and recognized
evidence flags. It does not fetch extracted resume text or broad
`parsed_profile` and `user_profile` objects.

Repository validation converts projected values into a sanitized evidence
shape before returning them to the page. The public pair type does not expose
raw project, experience, certification, contact, link URL, owner, or source
JSON. Invalid structure, ownership, timestamps, or evidence fails closed with
finite user-safe copy.

`savedAt` is the database saved time for the immutable saved report; it is not
proof of when the underlying resume was authored or changed.
`versionStatus: "not_recorded"` truthfully records that historical version
metadata is unavailable. The interface must not invent an ordering beyond
saved time or call a saved report an analysis version.

## Deletion, ownership, and stale work

Deleting a selected source remotely is detected the next time the person uses
Compare or Refresh. A missing or malformed source removes the visible result,
keeps both source slots available for replacement, and never falls back to a
different report. Comparison itself does not delete or retain a substitute
artifact.

Account ownership is guarded at several layers. The list and pair queries are
qualified by the authenticated owner, while the page binds published state to
an owner key, context epoch, and monotonically increasing request token.
Account changes synchronously mask history, selections, results, and errors
before effects run. Late success and failure responses, older requests, logout,
and unmount cannot publish into a newer owner context.

## Bounded skills and disclosure

Core accepts bounded evidence inputs and returns no more than 100 labels in
each retained, Source-A-only, or Source-B-only skill group. If any output group
exceeds that boundary, `skills.truncated` is true and the interface visibly
announces: “Showing up to 100 items per skill group. Additional detected
differences are not displayed.”

The notice is conditional and available to assistive technology. It does not
rank hidden items, imply a score or hiring effect, or offer expansion,
pagination, or raw-evidence access.

## Accessibility and responsive boundary

Source A precedes Source B in DOM order. Assignment and Compare work by
keyboard, visible focus is preserved, successful and failed comparisons
receive focus, status changes are announced, and errors use alert semantics.
Signal meaning is written in text rather than color alone.

The focused browser contract covers a 320-pixel viewport without horizontal
overflow, reduced-motion preference without hidden or blocked controls, and an
Axe scan with no serious or critical findings. The premium light-first visual
system and narrow-screen wrapping remain unchanged.

## Verification and CI

The reusable Core fixture has two explicit modes. Its default implementation
mode retains the original exact four-dirty-path boundary. `--closure` instead
proves the accepted Core commit is an ancestor of `HEAD`, proves the three Core
runtime paths have no diff from that commit, enforces the bounded Phase 2B path
set, and runs the same domain, repository, projection, ownership, privacy,
timestamp, evidence, and preservation behavior tests.

CI runs the explicit Core closure fixture and the complete focused comparison
suite in Chromium. The workflow remains Chromium-only. Stable local commands
run the three `@critical` privacy, successful-pair, and delayed-owner-switch
flows in Firefox and WebKit; the two `@race` flows also run three times in
Chromium during closure validation.

## Known limits and evidence still required

This closure is local engineering evidence. It does not include hosted
PostgREST verification, a Production deployment, Production database contact,
or real-user comprehension and decision-value evidence. Remote deletion is
noticed only on Compare or Refresh. Historical version metadata remains
unavailable, so the interface can show saved time but cannot reconstruct a
version lineage.

The focused suite emits the pre-existing Next.js smooth-scroll warning caused
by global application styling. It is non-blocking and unrelated to comparison
correctness; resolving it requires a future global navigation decision rather
than a Phase 2 suppression.

Controlled early-access evidence is still required before the feature can be
treated as validated. Review whether people understand saved reports and
bounded differences, make a useful next decision, avoid score chasing, and can
operate the flow accessibly. Revise the explanation or interaction if the gap
is correctable; defer or remove comparison if it encourages causal or hiring
claims, creates harmful score chasing, or does not change the user's next
action.
