# SvelteKit visual editing package: process and plan

## Goal

Build `@tinacms/sveltekit` to bring TinaCMS visual editing to SvelteKit 3 and
Svelte 5. Use `@tinacms/astro` as the feature reference, while keeping the
public API and runtime idiomatic to SvelteKit and Svelte.

## Compatibility target

- SvelteKit `^3.0.0`.
- Svelte `^5.57.1`, the minimum required by SvelteKit 3 at the time this work
  began.
- Browser, Node, and edge-compatible server code where SvelteKit permits it.
  Do not make Node request context storage a requirement for the integration.

## Feature map from Astro

| Astro surface | SvelteKit direction | Status |
|---|---|---|
| `requestWithMetadata` | Server `load` helper that accepts the SvelteKit request event, adds Tina metadata, applies preview overlays, and records forms in `locals` | Initial implementation |
| Integration middleware | A composable SvelteKit `Handle` hook that collects forms and injects edit-mode form payloads and bridge bootstrap into HTML | Initial implementation |
| `isEditMode` | Framework-neutral request check, carried over from Astro | Initial implementation |
| `tinaField` | Re-export the shared bridge helper | Initial implementation |
| `TinaMarkdown` | Svelte 5 component/renderer for Tina rich-text data and custom components | Planned |
| Astro islands and static island endpoints | Reassess against SvelteKit SSR, prerender, and client navigation; do not copy Astro component or routing APIs | To design |
| Vite bridge delivery and production asset emission | Serve `/admin/bridge.js` in development and make the asset available in production without writing into application source at config time | To design |
| Dev content invalidation | Determine whether SvelteKit/Vite needs a content watcher for Tina-created routes and new content | To investigate |

## Implementation sequence

1. Establish package metadata, exports, and TypeScript build configuration.
2. Port the framework-independent request, metadata, edit-mode, and form
   collection behavior to the SvelteKit request lifecycle.
3. Validate hook composition, HTML response handling, and preview overlays with
   a minimal SvelteKit 3 app.
4. Design and implement Svelte 5 rich-text rendering and editor-driven updates.
5. Add development and production bridge asset delivery, then test with the
   Tina admin iframe.
6. Create a SvelteKit example using the shared kitchen-sink content model and
   document setup and limitations.
7. Run package type/build checks and example build/dev verification across
   supported adapter modes.

## Current decisions and open questions

- Form state is stored on the current SvelteKit `event.locals`, not in
  `AsyncLocalStorage`; this keeps the request path portable to edge runtimes.
- The hook is explicitly composed by the app through SvelteKit's hook API. It
  must document composition with other `handle` hooks.
- Svelte 5 runes and component events should be used for new Svelte components.
- SvelteKit 3 requires TypeScript 6 in consuming apps, so this package pins
  its development compiler to the compatible major. Its build still needs
  verification within the monorepo toolchain.
- SvelteKit 3 is newly released. Its hook and package APIs should be checked
  against official docs and a real SvelteKit 3 consumer before treating this
  initial port as stable.

## First-pass API sketch

Compose the Tina hook with the app's existing hooks:

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { tinaHandle } from '@tinacms/sveltekit/hooks';

export const handle = sequence(tinaHandle);
```

Pass the SvelteKit load event to the data helper so it can read preview
overlays and record forms on that request's `locals`:

```ts
// src/routes/posts/[slug]/+page.server.ts
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import client from '$lib/tina/__generated__/client';

export async function load(event) {
  return requestWithMetadata(
    client.queries.post({ relativePath: `${event.params.slug}.md` }),
    event,
    { priority: 'primary' }
  );
}
```

These are provisional examples. Hook composition, generated-client types, and
route behavior still need validation in a SvelteKit 3 consumer.

## Progress log

### 2026-10-12

- Read the root and examples guidance, the Astro package, and the shared bridge
  metadata/preview APIs.
- Added the initial package scaffold and compatibility/feature plan.
- Added a first pass at `requestWithMetadata`, edit-mode detection, form
  payload collection, and the composable `tinaHandle` hook.
- Confirmed SvelteKit 3 requires Svelte 5.57.1, TypeScript 6, Vite 8, and
  Node 22.17 or newer from the official migration guide. Set the package's
  TypeScript dev dependency to the compatible major; compatibility remains to
  be checked against a real SvelteKit 3 app.
- Bridge asset serving, client-navigation refresh, Svelte 5 rich text, and
  adapter/prerender behavior remain unimplemented.
