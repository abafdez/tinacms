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
| Astro islands and static island endpoints | `TinaIsland.svelte` marker plus an experimental SvelteKit server handler; hybrid adapter smoke test remains | Experimental |
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

## Next agenda

The user confirmed that live edits, click-to-focus, post navigation, and the
ordinary visitor response work in Vite dev. Continue with these goals:

1. **Finish hybrid prerendered editing.** Integrate the experimental island
   marker and server handler in the example under a server-capable adapter, then
   verify priming and live edits in Tina.
2. **Teach the deployment choices.** Provide a static-only build that omits
   Tina admin assets, and a hybrid build that prerenders pages while serving
   the refresh endpoint at runtime.
3. **Finish package verification.** Check exports, generated declarations,
   consumer installation, and the server/static support matrix.

## Rich-text renderer components

`TinaMarkdown.svelte` renders these Tina rich-text nodes and lets the app
replace their default output with Svelte components through `components`:

| Node / key | Default output | Override props |
|---|---|---|
| `p`, `h1`–`h6`, `ul`, `ol`, `li`, `blockquote` | Matching HTML element | `children` snippet |
| `lic` | `<div>` | `children` snippet |
| `a` | Sanitized `<a href>` | `url`, `children` snippet |
| `img` | Sanitized `<img src>` | `url`, `alt`, `caption` |
| `code_block` | `<pre><code class="language-…">` | `value`, `lang` |
| `table` | HTML table | `node`, `children` snippet |
| `tr`, `th`, `td` | HTML table row/cell | `children`; cells also receive `align` |
| `hr`, `break` | `<hr>`, `<br>` | no props |
| `html`, `html_inline` | Escaped text | `value` |
| Named MDX component, such as `Callout` | Visible missing-component label | Saved MDX props |

Text leaves render inline marks (`bold`, `italic`, `underline`,
`strikethrough`, `code`, and `highlight`) as semantic HTML. `invalid_markdown`
renders its source in a `<pre>`. The renderer also handles native Tina tables
and the legacy MDX `table` shape. These are internal rendering branches, not
separately exported Svelte components; Astro's `Container`, `ImageNode`,
`Leaf`, and `CodeBlockNode` are implementation files rather than public
component names.

Neither `tinacms` nor this SvelteKit package declares Shiki. Astro's
`CodeBlockNode.astro` also emits plain `<pre><code>`; its README's Shiki
reference is an example of an app-provided override. SvelteKit apps can do the
same by installing Shiki themselves and passing a `code_block` component. The
override API is typed in `src/types.ts` as `value` and optional `lang`. A Svelte
override can call Shiki's `codeToHtml()` and render only that generated result
with `{@html ...}`; never pass CMS-provided HTML directly to `{@html ...}`.

The default renderer now gives headings, paragraphs, lists, blockquotes,
links, images, inline code, code blocks, and tables restrained built-in
spacing and styles. Default nodes use `tina-markdown-*` classes, so a project
can target the renderer without replacing every node; component overrides
remain fully app-styled.

The package's Vitest server suite covers default markup, code-block and named
MDX overrides, native tables, and unsafe URL handling. Its Chromium suite
checks the computed default styles for code blocks, images, and tables. The
example app still needs a separate browser check of the Tina iframe editing
flow.

### Run the package tests

From the monorepo root, install workspace dependencies if needed and run:

```sh
pnpm install
pnpm --filter @tinacms/sveltekit test
```

To run only the renderer tests:

```sh
pnpm --filter @tinacms/sveltekit exec vitest run src/__tests__/TinaMarkdown.test.ts
```

To watch the package suite while editing:

```sh
pnpm --filter @tinacms/sveltekit test-watch
```

The renderer's browser styles can be checked separately with:

```sh
pnpm --filter @tinacms/sveltekit test-browser
```

The server suite does not require a browser. The browser suite needs Playwright
Chromium and its host system libraries; install them with
`pnpm --filter @tinacms/sveltekit exec playwright install --with-deps chromium`
when setting up a fresh machine.

Do not treat an item as complete from compilation alone; each runtime item
needs verification in the SvelteKit consumer.

## Current decisions and open questions

- Form state is stored on the current SvelteKit `event.locals`, not in
  `AsyncLocalStorage`; this keeps the request path portable to edge runtimes.
- The hook is explicitly composed by the app through SvelteKit's hook API. It
  must document composition with other `handle` hooks.
- Svelte 5 runes and component events should be used for new Svelte components.
- Vite 8's client environment emits the bridge asset into the client build, so
  it does not get duplicated into the server build. In development, the Vite
  middleware serves it directly without writing a JS file into `static/`.
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
pnpm add -D tinacms @tinacms/sveltekit
pnpm add -D @tinacms/cli
#for development of the extension
pnpm add -D tinacms @tinacms/sveltekit --workspace
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

Subscribe to admin edits in the Svelte page so Tina's `updateData` messages
update the rendered data. Keep the request result (including its `id`) for the
subscription, and mark fields using the parent query object:

```svelte
<script lang="ts">
  import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';
  import { subscribeToTinaData } from '@tinacms/sveltekit/data';
  import { tinaField } from '@tinacms/sveltekit';
  import Callout from '$lib/components/Callout.svelte';

  let { data } = $props();
  let post = $state(data.data.post);
  const components = { Callout };

  $effect(() => {
    const query = data;
    post = query.data.post;
    return subscribeToTinaData(query, (updated) => {
      post = updated.post;
    });
  });
</script>

<div data-tina-field={tinaField(post, 'body')}>
  <TinaMarkdown content={post.body} {components} />
</div>
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

The renderer escapes plain HTML nodes as text, sanitizes CMS link and image
URLs, and supports named component overrides plus native and legacy table
shapes. Mark editable fields with `data-tina-field={tinaField(data, 'field')}`.

For local development, the app's `dev` script should run Tina's CLI around
the SvelteKit Vite server (for example `tinacms dev -c "vite dev"`). For a
hybrid production build, pass `vite build` to `tinacms build` with `-c`. The
CLI starts its local GraphQL server before it runs that command, which lets
SvelteKit fetch Tina content while prerendering. Running `vite build` after
`tinacms build` exits does not keep that local API available. The package's
Vite plugin serves the bridge from the package during development and emits
`admin/bridge.js` into the client build for production.

The experimental island API is intended for prerendered pages deployed with a
server-capable adapter. A static-files-only deployment cannot run its refresh
endpoint, so the static build uses `adapter-static` and omits the generated
`build-static/admin` output. Non-root deployment paths are supported by
`TinaIsland`'s `basePath` prop; a separate-origin Tina admin is not part of
this first pass.

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

### 2026-10-13

- Staging `bridge.js` in the source `static/admin` directory makes Vite treat
  it as a public JS file and reject the component's module import. Keep dev
  delivery in middleware and emit the asset into the client build instead.
- Added Svelte component prop types for built-in rich-text overrides and a
  generic map for typed Tina template components. Package build and TypeScript
  checks pass; consumer-side component inference still needs verification.
- Changed `TinaBridge.svelte` to form the bridge URL at runtime so Vite does
  not try to resolve `/admin/bridge.js` as a source import. Package build and
  TypeScript checks pass; the running SvelteKit app still needs verification.
- Added `subscribeToTinaData()` for same-origin `updateData` messages and
  documented how a Svelte 5 page can update its reactive query data. Package
  build and TypeScript checks pass; the kitchen-sink page still needs to wire
  this subscription and be verified in the editor.

### 2026-10-14

- Added `@tinacms/sveltekit/experimental` with an island request handler using
  Svelte 5 server rendering; its test confirms that `requestWithMetadata()`
  applies the Tina preview overlay before rendering.
- Added `TinaIsland.svelte` with encoded endpoint parameters, optional base
  path, a primary-island marker, and wrapper validation. The experimental
  handler validates same-origin preview POSTs, limits and checks the JSON
  envelope, returns uncached HTML, and renders only registered components.
- Added handler and component tests for overlay rendering, priming, rejected
  requests, payload size, and marker serialization. All 19 package tests,
  TypeScript checks, and the package build pass.
- Changed `tinaHandle` to inject forms and the bridge with SvelteKit's
  `transformPageChunk`, keeping editor-mode HTML streaming. Non-editor
  responses are returned unchanged, and non-HTML editor responses retain
  their body and content length.
- Added tests for per-request form ordering, field metadata, editor-message
  filtering, bridge dev serving, and build asset emission. TypeScript, Vitest,
  and the package build pass.
- Added a streaming-response test that reads injected editor HTML before the
  source response completes.
- Added package usage docs for composing `tinaHandle` with existing hooks.
- The example's client build emitted `.svelte-kit/output/client/admin/bridge.js`.
  The build then failed at the adapter-static prerender check because the
  example still had dynamic routes without prerender entries.
- Added a marked post title alongside the body. The user confirmed live edits,
  click-to-focus, and navigation in the running example, and confirmed that a
  regular page response has no Tina form payload or bridge request.
- Added `adapter-node` as the example's hybrid adapter while preserving the
  `adapter-static` branch. The dynamic post pages now provide prerender entries
  and use `TinaIsland` with a matching `/tina-island/[name]` POST route.
- Changed the hybrid `build` script to run SvelteKit's build under
  `tinacms build --local --skip-cloud-checks -c`, keeping the local Tina API
  alive during prerendering. Added `build:static` for static output and made
  the root layout prerenderable so the static adapter includes the home and
  post-list pages. The post detail route supplies entries; the refresh POST
  endpoint remains server-only and is intentionally absent from the static
  deployment.
- Verified both scripts end to end: the hybrid build completed with
  `adapter-node`; the static build completed with `adapter-static`, prerendered
  every post entry, and removed `build-static/admin/index.html`. Its client
  output does not contain the generated `admin/bridge.js` asset. The runtime
  editing flow still needs a browser check against the generated Node server.

## Manual SvelteKit iframe check

From `examples/sveltekit/kitchen-sink/`, run `pnpm dev`. Its `dev` script
starts Tina's local GraphQL/admin process and runs `vite dev`. If Tina is
already running separately, start the app with `./node_modules/.bin/vite dev`.

1. Open the example's Tina admin and preview the `hello-world` post at
   `/posts/hello-world`.
2. In browser developer tools, confirm `/admin/bridge.js` loads with status
   200 and the preview document contains `data-tina-form` and
   `data-tina-primary`.
3. Click the post title and body in the preview. Tina should select the
   matching fields.
4. Change the title or body without saving. The preview should update from
   Tina's unsaved data.
5. Navigate to another post in the preview and repeat the field check.
6. Open `/posts/hello-world` directly outside Tina. It should render normally
   without `data-tina-form` payloads or a bridge request.

## Manual hybrid build check

The SvelteKit example's default adapter is `adapter-node`. From
`examples/sveltekit/kitchen-sink/`, run `pnpm build`, then start the generated
Node server with `pnpm preview`. The script starts Tina's local GraphQL server
and runs `vite build` before Tina shuts down.

1. Open a prerendered post from the Tina admin preview.
2. In Network, confirm the bridge primes the island with a POST to
   `/tina-island/post?slug=...` and receives HTML containing `data-tina-form`.
3. Edit the post without saving. The preview should refresh from the island
   endpoint with the unsaved overlay.
4. Open the same post outside Tina. The static page should not have a Tina form
   payload; the endpoint should only be called from the editor iframe.

## Manual static build check

From `examples/sveltekit/kitchen-sink/`, run `pnpm build:static`. This still
uses Tina's local GraphQL server to render the content, but selects
`adapter-static`. It removes `build-static/admin` from the generated site, and
the static host cannot provide the island refresh endpoint.

1. Confirm `build-static/index.html` and
   `build-static/posts/hello-world.html` exist.
2. Confirm `build-static/admin/index.html` does not exist.
3. Serve the `build-static/` directory with a static file server and open the
   home page and post URL. The post should render with content from build time.
4. Tina visual editing and unsaved island refreshes require the hybrid Node
   build; the static build is for public pages only.
