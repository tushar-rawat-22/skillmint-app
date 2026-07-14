# Trust Center

> **Block 5 engineering status: CLOSED AND FROZEN.** Routes are `/settings/data` for controls and `/privacy` for public context. Production rollout and external privacy-contact verification remain release blockers.

The Trust Center distinguishes auth loading, signed out, signed in, and unconfigured account access. Browser summary loads after render from the registered inventory. Storage unavailable is not shown as corrupt or zero. Only the current owner partition is visible; legacy anonymous import is explicit and guarded.

Browser summary, browser actions, account counts, account export, saved-report deletion, and account deletion have separate state. Commit-bound owner/epoch/request tokens mask old results immediately and block stale async publication. Counts show zero only after validated pre/post provider-identity checkpoints.

Export copy says only that the download was requested. Browser export is current visible browser data; account export is a separate authenticated allowlisted collection. Neither claims provider-history completeness, an atomic snapshot, or permanent OS save.

The danger hierarchy is browser-wide clear, saved-report deletion, then account deletion. Confirmed account deletion cleans only the captured owner’s browser partition and cannot sign out a newly active different account. The isolated live gate proved the production export boundary, exact RLS, recent auth/refresh, the real local route, hard Auth deletion, stale-token denial, concurrent-write containment, and full cleanup.

Automated Chromium, Firefox, and WebKit coverage passed with zero retries, skips, or flakes. WebKit is not Safari certification; structural ARIA/axe/focus coverage is not real VoiceOver, NVDA, or JAWS speech certification; accepted browser downloads are not permanent OS-save proof. Legal review, provider backup/log retention, production rollout, verified contact monitoring, and operational ownership remain open.
