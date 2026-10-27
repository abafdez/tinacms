---
"@tinacms/astro": patch
"@tinacms/sveltekit": patch
---

`TinaMarkdown` renders a code block from its lines rather than its parsed `value`, matching the React renderer. The editor only updates the lines, so edits to an existing code block now show in the live preview.
