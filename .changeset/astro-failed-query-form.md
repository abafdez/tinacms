---
"@tinacms/astro": patch
---

`requestWithMetadata()` no longer records an editor form for a query that failed. It still resolves to empty `data`, as before.
