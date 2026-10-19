# `@tinacms/sveltekit`

TinaCMS visual editing for SvelteKit 3 and Svelte 5. `@tinacms/astro` is the
feature reference; the API follows SvelteKit and Svelte 5 conventions.

- **Usage:** [Setup](#setup) to [Deployment modes](#deployment-modes)
- **Development:** [Developing the package](#developing-the-package) and
  [Status and roadmap](#status-and-roadmap)

A working consumer lives in
[`examples/sveltekit/kitchen-sink`](../../../examples/sveltekit/kitchen-sink/README.md).

## Requirements

- SvelteKit `^3.0.0`, Svelte `^5.57.1`, Vite 8, TypeScript 6, Node 22.17+
- `tinacms` and `@tinacms/cli` configured in the app's `tina/` folder

## How it works

During `pnpm dev`, Tina's CLI runs a local GraphQL server and wraps the Vite
dev server (`tinacms dev -c "vite dev"`). The Tina admin loads your site in an
iframe:

1. `tinaHandle` (server hook) detects editor-iframe requests, collects every
   Tina form queried during the render, and injects the form payloads and the
   bridge bootstrap into the HTML stream.
2. `TinaBridge` (root layout) starts the bridge only inside the iframe and
   refreshes forms after SvelteKit client-side navigation.
3. `subscribeToTinaData` delivers unsaved sidebar edits (`updateData`
   messages) to the page, so it re-renders without reloading.
4. `tinaField()` adds `data-tina-field` attributes so clicking an element
   focuses its field in the sidebar.

Ordinary visitors get no form payloads and never load the bridge.

## Setup

```sh
pnpm add tinacms @tinacms/sveltekit
pnpm add -D @tinacms/cli
```

Register the Vite plugin. It serves `/admin/bridge.js` in development and emits
it into the client build; it never writes into `static/`.

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { tinaVitePlugin } from '@tinacms/sveltekit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), tinaVitePlugin()],
});
```

Compose the hook. If the app already has `handle` hooks, put `tinaHandle` in
the same `sequence(...)`; every hook must call `resolve(event)`.

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { tinaHandle } from '@tinacms/sveltekit/hooks';

export const handle = sequence(tinaHandle);
```

Mount the bridge once in the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import TinaBridge from '@tinacms/sveltekit/TinaBridge.svelte';

  let { children } = $props();
</script>

<TinaBridge />
{@render children()}
```

Scripts: `"dev": "tinacms dev -c \"vite dev\""`. For production builds that
prerender Tina content, run Vite *inside* the CLI so the local GraphQL server
stays up: `tinacms build --local --skip-cloud-checks -c "vite build"`. Running
`tinacms build && vite build` does not work; Tina exits before SvelteKit
prerenders.

## Load and render data

Wrap each generated query in a server `load` with `requestWithMetadata()`. The
event lets it apply the iframe's unsaved overlay and register the form.

```ts
// src/routes/posts/[...slug]/+page.server.ts
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import client from '../../../../tina/__generated__/client';

export const load = async (event) => ({
  postQuery: await requestWithMetadata(
    client.queries.post({ relativePath: `${event.params.slug}.md` }),
    event,
    { priority: 'primary' }
  ),
});
```

Subscribe in the page and mark editable elements. Keep the query result
(including its `id`) for the subscription.

```svelte
<script lang="ts">
  import { tinaField } from '@tinacms/sveltekit';
  import { subscribeToTinaData } from '@tinacms/sveltekit/data';
  import TinaMarkdown from '@tinacms/sveltekit/TinaMarkdown.svelte';

  let { data } = $props();
  let preview = $state<{ id: string; data: any }>();

  $effect(() => {
    const query = data.postQuery;
    return subscribeToTinaData(query, (updated) => {
      preview = { id: query.id, data: updated };
    });
  });

  const post = $derived(
    (preview?.id === data.postQuery.id ? preview.data : data.postQuery.data).post
  );
</script>

<h1 data-tina-field={tinaField(post, 'title')}>{post.title}</h1>
<div data-tina-field={tinaField(post, 'body')}>
  <TinaMarkdown content={post.body} />
</div>
```

## Rich text: `TinaMarkdown`

Renders Tina rich-text and lets you override any node through `components`:

| Node / key | Default output | Override props |
|---|---|---|
| `p`, `h1`–`h6`, `ul`, `ol`, `li`, `blockquote` | Matching element | `children` snippet |
| `lic` | `<div>` | `children` snippet |
| `a` | Sanitized `<a href>` | `url`, `children` |
| `img` | Sanitized `<img src>` | `url`, `alt`, `caption` |
| `code_block` | `<pre><code class="language-…">` | `value`, `lang` |
| `table`, `tr`, `th`, `td` | HTML table (native and legacy MDX shapes) | `children`; cells get `align` |
| `hr`, `break` | `<hr>`, `<br>` | none |
| `html`, `html_inline` | Escaped text | `value` |
| MDX template name, e.g. `Callout` | Missing-component label | The template's props |

- Text marks (`bold`, `italic`, `underline`, `strikethrough`, `code`,
  `highlight`) render as semantic HTML. Leaves are recognised by `type: 'text'`
  *or* by a string `text` field, because the editor sends newly typed text as
  `{ text }` without a type.
- Shortcode templates declare `match: { start: '{{%', name: 'pull-quote', end: '%}}' }`
  in the schema and are keyed by template name in `components`.
- Default nodes have `tina-markdown-*` classes and light built-in styles;
  overrides are fully app-styled.
- Link and image URLs are sanitized. Never pass CMS HTML to `{@html}`.
- Syntax highlighting is up to the app: install Shiki yourself and pass a
  `code_block` override that renders Shiki's output.

## Prerendered pages (experimental islands)

`adapter-static` has no runtime server, so it can't refresh content. With a
server-capable adapter (e.g. `adapter-node`), pages can be prerendered and
still edit live: `TinaIsland` marks a region, and the bridge re-renders it
through an endpoint with the unsaved overlay.

```ts
// src/routes/tina-island/[name]/+server.ts
import { experimental_createIslandHandler } from '@tinacms/sveltekit/experimental';
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import PostView from '#lib/components/PostView.svelte';
import client from '#tina/__generated__/client.ts';

export const POST = experimental_createIslandHandler({
  post: {
    component: PostView,
    wrapper: { tag: 'article', className: 'prose' },
    fetch: async (event, params) => {
      const slug = params.get('slug');
      if (!slug) throw new Error('Missing post slug');
      return requestWithMetadata(
        client.queries.post({ relativePath: `${slug}.md` }),
        event,
        { priority: 'primary' }
      );
    },
    propsFromData: (data) => ({ post: data }),
  },
});
```

```svelte
<TinaIsland name="post" wrapper={{ tag: 'article', className: 'prose' }}
  params={{ slug: data.slug }} primary>
  <PostView post={data.post} />
</TinaIsland>
```

- The registry key, `name`, and `wrapper` must match. Pass `basePath` if the
  app uses a SvelteKit base path.
- The endpoint accepts only same-origin Tina preview POSTs, bounds and
  validates the JSON envelope, renders only registered components, and sends
  `Cache-Control: no-store`. Never choose components from request input.

## Deployment modes

| Deployment | Live editing |
|---|---|
| Server adapter, SSR pages | Yes, through `tinaHandle` |
| Server adapter, prerendered pages + island endpoint | Yes (experimental) |
| `adapter-static`, files only | No; build without the admin and bridge |

Notes: editor-mode HTML is injected with `transformPageChunk` (streamed, not
buffered) and `content-length` is dropped only for that HTML. `tinaHandle`
can't touch pages already served as static files. A Tina admin on a separate
origin isn't supported yet.

## Developing the package

From the monorepo root:

```sh
pnpm install
pnpm --filter @tinacms/sveltekit test          # Vitest, server suite
pnpm --filter @tinacms/sveltekit test-browser  # headless Chromium suite
pnpm --filter @tinacms/sveltekit types
pnpm --filter @tinacms/sveltekit build
```

The first browser run on a fresh machine needs
`pnpm --filter @tinacms/sveltekit exec playwright install --with-deps chromium`.

Layout:

| Path | Purpose |
|---|---|
| `src/hooks.ts` | `tinaHandle`: form collection and HTML injection |
| `src/data.ts` | `requestWithMetadata`, `subscribeToTinaData` |
| `src/vite.ts` | `tinaVitePlugin`: bridge in dev and build |
| `src/TinaBridge.svelte` | Iframe bootstrap and navigation refresh |
| `src/TinaMarkdown.svelte` | Rich-text renderer |
| `src/TinaIsland.svelte`, `src/experimental/` | Island marker and endpoint |
| `src/internal/` | Per-request form store (on `event.locals`), escaping |
| `src/__tests__/` | `*.test.ts` (server), `*.browser.test.ts` (Chromium) |

Design decisions:

- Form state lives on `event.locals`, not `AsyncLocalStorage`, so the request
  path stays edge-compatible.
- Use Svelte 5 runes for all components.
- The bridge is served by Vite middleware in dev and emitted only into the
  client build. Putting it in `static/admin` makes Vite reject the import.
- No item counts as done from compilation alone; runtime behavior needs a
  check in the example app.

Working in WSL without a browser: reproduce renderer bugs with a
`*.browser.test.ts` (headless, using `rerender()` to replay editor updates),
check the dev server with `curl -s localhost:5173/<path> | grep data-tina`, and
leave visual checks in the Tina admin to a human. Don't read
`tina/__generated__/` files whole; grep for what you need.

## Status and roadmap

Verified:
- Dev iframe flow: field focus, live unsaved edits, navigation between
  posts, and plain visitor responses with no editor payload.
- Both example builds (Node hybrid and static) complete.
- 19 server tests and 2 browser tests pass.

Next:
1. **Hybrid runtime check:** `pnpm build && pnpm preview` in the example. Open
   a post from Tina, confirm the iframe POSTs to `/tina-island/post?slug=…`,
   and that unsaved edits refresh the island. Keep the island API experimental
   until this passes.
2. **Publishing:** validate exports, declarations, and peer ranges, and do a
   clean install outside the monorepo.
3. **Content invalidation:** check whether Vite needs a watcher for content
   and routes created in Tina during dev.

References: [Tina Astro visual editing](https://tina.io/docs/contextual-editing/astro),
[SvelteKit adapters](https://svelte.dev/docs/kit/adapters),
[page options](https://svelte.dev/docs/kit/page-options),
[svelte/server](https://svelte.dev/docs/svelte/svelte-server).
