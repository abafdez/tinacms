---
"@tinacms/sveltekit": patch
---

Edit-mode responses are now sent with `Cache-Control: private, no-store`, so a shared cache can't store a page carrying the editor's form payloads. `requestWithMetadata()` no longer records an editor form for a query that failed; it still resolves to empty `data`.
