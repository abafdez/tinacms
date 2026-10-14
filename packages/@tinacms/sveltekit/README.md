# `@tinacms/sveltekit`

TinaCMS visual editing helpers for SvelteKit 3 and Svelte 5.

The current integration targets server-rendered SvelteKit routes. It collects
Tina query data during server loads, adds field metadata, and exposes unsaved
editor data to the page inside Tina's preview iframe.

## Setup

Add the package, register its Vite plugin, and include `TinaBridge` in the root
layout. The app also needs the Tina CLI and admin configured in its Tina
project.

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { tinaVitePlugin } from '@tinacms/sveltekit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), tinaVitePlugin()],
});
```

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { tinaHandle } from '@tinacms/sveltekit/hooks';
import { authHandle } from './auth';

export const handle = sequence(authHandle, tinaHandle);
```

If the app already has a `handle` hook, add `tinaHandle` to the same
`sequence(...)` call. Each hook must call `resolve(event)` to continue the
request. `tinaHandle` initializes the request's form list before rendering,
then injects form payloads and the bridge bootstrap only for editor iframe
HTML responses.

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import TinaBridge from '@tinacms/sveltekit/TinaBridge.svelte';

  let { children } = $props();
</script>

<TinaBridge />
{@render children()}
```

## Load and render Tina data

Wrap each generated Tina query in a server `load` function with
`requestWithMetadata()`. Pass the SvelteKit event so the helper can apply the
iframe's unsaved overlay and collect the form for the hook.

```ts
// src/routes/posts/[slug]/+page.server.ts
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

In the page, subscribe to editor updates and attach `tinaField()` to the
elements editors should be able to select:

```svelte
<script lang="ts">
  import { subscribeToTinaData } from '@tinacms/sveltekit/data';
  import { tinaField } from '@tinacms/sveltekit';

  let { data } = $props();
  let preview = $state<{ id: string; post: typeof data.data.post }>();
  let post = $derived(
    preview?.id === data.id ? preview.post : data.data.post
  );

  $effect(() => {
    const query = data;
    return subscribeToTinaData(query, (updated) => {
      preview = { id: query.id, post: updated.post };
    });
  });
</script>

<h1 data-tina-field={tinaField(post, 'title')}>{post.title}</h1>
```

`TinaBridge` starts only inside the editor iframe. It reloads the bridge from
`/admin/bridge.js` and refreshes the form list after SvelteKit client-side
navigation. The Vite plugin serves this URL in development and emits it into
the client build for production. It does not write a bridge file into the
application's `static/` directory.

## Hybrid prerendered pages

`adapter-static` output cannot run an island refresh endpoint. To keep pages
prerendered and support live Tina edits, deploy them with an adapter that also
runs SvelteKit server routes. The `TinaIsland` component marks the region in
the prerendered HTML. The bridge bootstrapped by `TinaBridge` then calls a
server endpoint to load the region with Tina's current unsaved data.

Create a dynamic endpoint at `src/routes/tina-island/[name]/+server.ts`:

```ts
import { experimental_createIslandHandler } from '@tinacms/sveltekit/experimental';
import { requestWithMetadata } from '@tinacms/sveltekit/data';
import PostView from '$lib/PostView.svelte';
import client from '$lib/tina/__generated__/client';

export const POST = experimental_createIslandHandler({
  post: {
    component: PostView,
    wrapper: { tag: 'article', className: 'prose' },
    fetch: (event, params) => {
      const slug = params.get('slug');
      if (!slug) throw new Error('Missing post slug');

      return client.queries.post({ relativePath: `${slug}.md` }).then((result) =>
        requestWithMetadata(result, event, { priority: 'primary' })
      );
    },
    propsFromData: (data) => ({ post: data }),
  },
});
```

Import `requestWithMetadata` from `@tinacms/sveltekit/data` in that route.
Add the component to pages that should update live:

```svelte
<script lang="ts">
  import TinaIsland from '@tinacms/sveltekit/TinaIsland.svelte';

  let { data } = $props();
</script>

<TinaIsland
  name="post"
  wrapper={{ tag: 'article', className: 'prose' }}
  params={{ slug: data.slug }}
  primary
>
  <PostView post={data.post} />
</TinaIsland>
```

The registry key, `name`, and wrapper must match. `params` are encoded into the
endpoint URL. If the app uses a SvelteKit base path, pass that path in
`basePath` on `TinaIsland`. Keep `TinaBridge` in the root layout so its
iframe-only bootstrap can discover island markers and prime their Tina forms.

The endpoint accepts only same-origin Tina preview POST requests, caps and
validates the JSON envelope, renders the registered component on the server,
and returns `Cache-Control: no-store`. Keep the registry explicit and do not
choose components or load functions from request-provided module names.

## Rendering and deployment notes

- Ordinary requests are returned without body transformation. In editor mode,
  the hook uses SvelteKit's `transformPageChunk` to inject into the HTML stream
  without buffering the full response.
- The hook removes `content-length` for editor-mode HTML because injection
  happens as the response streams. It preserves response bodies and length
  headers for non-HTML editor requests.
- `tinaHandle` must run for SvelteKit server requests. It cannot modify pages
  that have already been prerendered and served as static files.
- The experimental `@tinacms/sveltekit/experimental` island handler needs a
  server-capable adapter. See the package [development plan](./plan-v1.md) for
  the current static and hybrid deployment matrix.

## Verification

From the monorepo root:

```sh
pnpm --filter @tinacms/sveltekit test
pnpm --filter @tinacms/sveltekit test-browser
pnpm --filter @tinacms/sveltekit types
pnpm --filter @tinacms/sveltekit build
```
