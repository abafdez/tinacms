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
| `TinaMarkdown` | Svelte 5 component/renderer for Tina rich-text data and custom components | Initial implementation |
| Astro islands and static island endpoints | Reassess against SvelteKit SSR, prerender, and client navigation; do not copy Astro component or routing APIs | To design |
| Vite bridge delivery and production asset emission | `tinaVitePlugin()` serves `/admin/bridge.js` in development and emits it into the client build | Initial implementation |
| Client-side route transitions | `TinaBridge.svelte` initializes the bridge inside the editor iframe and refreshes its forms after SvelteKit navigation | Initial implementation |
| Dev content invalidation | Determine whether SvelteKit/Vite needs a content watcher for Tina-created routes and new content | To investigate |

## Implementation sequence

1. Establish package metadata, exports, and TypeScript build configuration.
2. Port the framework-independent request, metadata, edit-mode, and form
   collection behavior to the SvelteKit request lifecycle.
3. Validate hook composition, HTML response handling, and preview overlays with
   a minimal SvelteKit 3 app.
4. Compare the Svelte 5 rich-text renderer against Astro's supported node set
   and test it with actual generated Tina content.
5. Validate development and production bridge delivery with the Tina admin
   iframe and SvelteKit client navigation.
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
- Vite 8's client environment is the only environment that emits the bridge
  asset, so it does not get duplicated into the server build.
- SvelteKit 3 requires TypeScript 6 in consuming apps, so this package pins
  its development compiler to the compatible major. Its build still needs
  verification within the monorepo toolchain.
- SvelteKit 3 is newly released. Its hook and package APIs should be checked
  against official docs and a real SvelteKit 3 consumer before treating this
  initial port as stable.

## Using the package from a SvelteKit 3 app

The current integration is intended for an SSR SvelteKit app. Start by adding
TinaCMS and the SvelteKit package to the app, with the CLI as a development
dependency:

```sh
pnpm add tinacms @tinacms/sveltekit
pnpm add -D @tinacms/cli
```

SvelteKit 3 moves app configuration into the `sveltekit()` Vite plugin, so
register the bridge plugin beside it in `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { tinaVitePlugin } from '@tinacms/sveltekit/vite';

export default defineConfig({
  plugins: [sveltekit(), tinaVitePlugin()],
});
```

Compose the request hook in `src/hooks.server.ts`:

```ts
import { sequence } from '@sveltejs/kit/hooks';
import { tinaHandle } from '@tinacms/sveltekit/hooks';

export const handle = sequence(tinaHandle);
```

Call the generated Tina query from `+page.server.ts` and pass the event to
`requestWithMetadata`:

```ts
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import client from '$lib/tina/__generated__/client';

export function load(event) {
  return requestWithMetadata(
    client.queries.post({ relativePath: `${event.params.slug}.md` }),
    event,
    { priority: 'primary' }
  );
}
```

Include `TinaBridge` once in the root layout for editor iframe startup and
client navigation refresh:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import TinaBridge from '@tinacms/sveltekit/TinaBridge.svelte';

  let { children } = $props();
</script>

<TinaBridge />
{@render children()}
```

Render Tina rich text with the Svelte component and register Svelte components
by the names used by the rich-text template:

```svelte
<script lang="ts">
  import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';
  import { tinaField } from '@tinacms/sveltekit';
  import Callout from '$lib/components/Callout.svelte';

  let { data } = $props();
  const components = { Callout };
</script>

<div data-tina-field={tinaField(data.post, '_body')}>
  <TinaMarkdown content={data.post._body} {components} />
</div>
```

The renderer escapes plain HTML nodes as text, sanitizes CMS link and image
URLs, and supports named component overrides plus native and legacy table
shapes. Mark editable fields with `data-tina-field={tinaField(data, 'field')}`.

For local development, the app's `dev` script should run Tina's CLI around
the SvelteKit Vite server (for example `tinacms dev -c "vite dev"`). For a
production build, run `tinacms build` before `vite build` so the admin SPA is
generated before SvelteKit builds the app. The package's bridge plugin emits
the corresponding bridge asset as part of Vite's client build.

This package does not yet support static prerendered pages, custom deployment
base paths, or a separate-origin Tina admin. The first consumer should use
same-origin `/admin/` and SSR routes while these cases are designed.

## Progress log

### 2026-10-12

- Read the root and examples guidance, the Astro package, and the shared bridge
  metadata/preview APIs.
- Added the initial package scaffold and compatibility/feature plan.
- Added a first pass at `requestWithMetadata`, edit-mode detection, form
  payload collection, and the composable `tinaHandle` hook.
- Added the Vite plugin for development bridge serving and client-build asset
  emission, plus `TinaBridge.svelte` for iframe initialization and SvelteKit
  navigation refresh.
- Added a Svelte 5 rich-text component, shared renderer types, and URL
  sanitizers based on the Astro renderer's node behavior.
- Confirmed SvelteKit 3 requires Svelte 5.57.1, TypeScript 6, Vite 8, and
  Node 22.17 or newer from the official migration guide. Set the package's
  TypeScript dev dependency to the compatible major; compatibility remains to
  be checked against a real SvelteKit 3 app.
- Adapter/prerender behavior, renderer parity, bridge build output, and client
  navigation still need verification against a real SvelteKit 3 app.
