---
"@tinacms/astro": patch
---

Edit-mode responses are now sent with `Cache-Control: private, no-store`, so a shared cache can't store the page with the bridge injected. Responses outside edit mode keep their headers.
