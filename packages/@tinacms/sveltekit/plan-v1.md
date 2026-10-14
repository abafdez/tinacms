# TinaCMS SvelteKit contextual editing — plan v1

Date: 2026-10-14

## Goal

Make `@tinacms/sveltekit` a documented and dependable visual-editing integration for SvelteKit 3 and Svelte 5. Keep development setup simple, support request-time rendering, and define exactly what works when pages are prerendered or the whole deployment is static.

## Support decision

Treat these as separate deployment modes:

1. **Server-rendered site:** visual editing works through SvelteKit's server hook and Tina bridge.
2. **Hybrid static site:** pages are prerendered, but the deployment adapter can still run a SvelteKit endpoint at request time. This can support live editing if the editable regions have a refresh endpoint and an iframe bootstrap.
3. **Static-files-only site (`adapter-static`):** there is no SvelteKit server at runtime, so it cannot run a per-edit render endpoint. Keep Tina available in development if desired, but do not claim production contextual editing for this deployment mode. A separate static build can omit the Tina admin and bridge.

The Astro docs use “static” for the second mode: pages are prerendered, while an SSR-capable adapter serves the island refresh endpoint. This is different from deploying only generated files.

## What Astro does

The Astro integration provides four connected pieces:

- Middleware detects editor requests, collects query forms, and injects the forms and bridge into the response.
- `requestWithMetadata()` applies unsaved preview data and adds field metadata.
- `<TinaIsland>` marks editable page regions and bootstraps the bridge on prerendered pages.
- A request-time island endpoint renders the marked region again with Tina's unsaved overlay and returns replacement HTML.

Production pages without islands receive no editing injection. Prerendered pages with islands carry a small bootstrap; the dynamic endpoint still requires a server adapter.

## SvelteKit evaluation

SvelteKit provides request hooks, per-route prerender settings, server endpoints, and server-side component rendering. That gives us plausible equivalents for the Astro pieces, but the package still needs a focused proof that a registered Svelte component can be rendered safely and consistently by an endpoint under the supported adapters.

Current package pieces include `tinaHandle`, `requestWithMetadata`,
`subscribeToTinaData`, `TinaBridge.svelte`, `tinaVitePlugin`, `tinaField`,
`TinaMarkdown.svelte`, and the experimental `TinaIsland.svelte` plus
`experimental_createIslandHandler()` API. The package README documents request
hooks, visual editing, and the hybrid endpoint. The example has separate
`adapter-node` and `adapter-static` builds. There is no SvelteKit-specific
`AGENTS.md`; the shared `examples/AGENTS.md` applies.

## Goals and phases

### Goal 1 — Confirm the rendering contract

- Verify a Svelte 5 component can be rendered from a SvelteKit server endpoint with data from the Tina overlay.
- Choose the public API for editable regions: a Svelte component plus a typed registry, and a route-handler helper or a documented route recipe.
- Confirm which SvelteKit adapters can serve prerendered pages and the runtime refresh endpoint together.
- Keep fully static hosting explicitly out of production contextual-editing support unless a separate runtime service is designed.

**Done when:** a small spike proves the component-render and route behavior on SvelteKit 3, and the package's support matrix is written down.

**Status: complete.** The spike is exposed as `@tinacms/sveltekit/experimental` and exports `experimental_createIslandHandler(registry)`. An application can mount the returned `RequestHandler` from a dynamic `+server.ts` route. Each registry entry loads data using the request event, maps it to component props, and declares the component and wrapper. The handler uses `svelte/server` to render the registered component, so Tina's existing `requestWithMetadata()` can supply unsaved overlay data to that render.

The package test calls the handler with a SvelteKit request event and a Tina preview envelope. It verifies the rendered Svelte component contains the unsaved overlay, that prime requests include the collected form payload, and that non-bridge requests are rejected. This verifies the request-handler and render contract; it is not yet a deployed-adapter smoke test.

The example currently resolves to SvelteKit 3.0.1, Svelte 5.57.2, and `adapter-static` 4.0.0. Type-checking and Vitest pass against those installed versions. SvelteKit's adapter guidance confirms `adapter-static` emits prerendered files, while mixing prerendered routes with a runtime endpoint requires another adapter. Therefore the support matrix is:

| Deployment | Island refresh endpoint | Support |
|---|---:|---|
| Server adapter, SSR pages | Available at request time | Supported by the proposed handler |
| Server adapter, prerendered pages plus `prerender = false` island route | Available at request time | Supported by the proposed hybrid design; adapter smoke test remains for Goal 3 |
| `adapter-static` deployed as files only | Unavailable after deployment | No production live editing |

The request handler remains experimental. The example's Node and static
adapter builds now complete; runtime behavior in the generated Node server
still needs a browser check from Tina.

### Goal 2 — Finish request-time visual editing

- Confirm per-request form collection, overlay substitution, primary-form selection, click-to-focus metadata, and editor updates across navigation.
- Make the bridge asset work in dev and production builds without importing Node-only modules into browser bundles or requiring users to copy files by hand.
- Review response buffering in edit mode and preserve normal production responses when editing is not active.
- Document how `tinaHandle` is composed with the user's existing SvelteKit hooks.

**Done when:** a server-rendered route can be opened from Tina, fields focus correctly, unsaved edits update the page, and ordinary visitors do not receive editor payloads or bridge injection.

**Status: complete.** The user verified in Vite dev that preview edits update
live, clicking fields selects their Tina fields, and post navigation works.
They also checked a regular page response: it has no form payload or bridge
bootstrap, and `/admin/bridge.js` does not load outside the Tina iframe.

**Progress:** The request hook now injects through SvelteKit's streaming
`transformPageChunk` API, and package tests cover per-request form collection,
primary selection, overlay rendering, bridge asset delivery, and update
message handling. Tests also verify concurrent requests do not share form
payloads and that injected HTML can be read before the response stream
finishes. The example's production client build emits
`.svelte-kit/output/client/admin/bridge.js`, and the post page marks title and
body fields. The user's Vite dev check confirms that clicking preview elements
selects their Tina fields and post navigation works. The user also confirmed
that edits update live and the ordinary visitor response omits Tina form
payloads and bridge injection.

### Goal 3 — Add hybrid static editing

- Add the Svelte equivalent of an Astro island marker, with a clear wrapper, route parameters, and a way to select the page's primary form.
- Add a request-time refresh endpoint that loads the registered data and renders the matching Svelte component with the current overlay.
- Add an iframe-only bootstrap to prerendered pages that use the marker.
- Guard the endpoint with same-origin and request-shape checks, avoid caching preview responses, and document the runtime adapter requirement.

**Done when:** a prerendered page deployed with a server-capable adapter edits live in Tina, while normal visitors receive only the documented bootstrap and no editor payloads.

**Progress:** The package now exports an experimental `TinaIsland.svelte`
marker and a server handler for a named island registry. The handler accepts
same-origin Tina preview POSTs, validates and bounds the JSON envelope, renders
with Svelte's server renderer, and disables caching. Package tests cover
overlay rendering, form priming, request rejection, body limits, and marker
serialization. The example has a prerendered post route, a matching island
endpoint, and separate Node and static adapters. Both builds complete using
Tina's local GraphQL server. The generated Node server has not yet been tested
in Tina, so the editor iframe refresh check remains open.

### Goal 4 — Make the example teach the deployment choices

- Keep one clear dev command with Tina enabled.
- Provide distinct scripts/configuration for a server or hybrid build and for a static-files-only build.
- Ensure the static-only build does not publish Tina admin assets or load the bridge, while the dev experience remains available.
- Add real post listing/detail data and field markers so the example demonstrates navigation, click-to-edit, rich text, and live updates.
- Replace the scaffold README with beginner-friendly setup, environment, build, and preview instructions.

**Done when:** each build command has an obvious output and documented capability; the static-only output contains no Tina admin, and the hybrid output includes the runtime refresh route.

**Progress:** `pnpm build` creates the Node adapter output in `build/` and
keeps the island endpoint available at runtime. `pnpm build:static` writes
static files to `build-static/`, prerenders the home, post listing, and post
details, omits the bridge plugin, and removes the copied Tina admin page. Both
commands have completed successfully. The example's scaffold README still
needs beginner-oriented SvelteKit/Tina setup and deployment instructions.

### Goal 5 — Publish and maintain the package

- Document installation, hook composition, query wrapping, `TinaBridge`, Vite configuration, adapter support, and both static modes in `packages/@tinacms/sveltekit/README.md`.
- Check package exports, declarations, peer dependency ranges, and clean installation outside the monorepo.
- Cover form collection, bridge asset serving, overlays, endpoint validation, component rendering, and the static/server deployment matrix with Vitest and browser checks.

**Done when:** package consumers can follow the README without copying undocumented internals, and the package/example verification steps pass on supported SvelteKit 3 and Svelte 5 versions.

## Verification outline

1. Run the package's Vitest unit suite and browser suite.
2. Run `svelte-check` and build the SvelteKit example in each supported mode.
3. In the example, open a post from Tina, click its title/body, type without saving, navigate between pages, and confirm the preview updates.
4. Inspect the static-only output to confirm the admin and bridge are absent; inspect the hybrid output to confirm its refresh route is served by the selected adapter.

Do not mark a deployment mode supported based only on a successful local Vite build; verify the generated output and runtime behavior for its adapter.

## References

- [TinaCMS Visual Editing Setup for Astro](https://tina.io/docs/contextual-editing/astro)
- [SvelteKit project types](https://svelte.dev/docs/kit/project-types)
- [SvelteKit page options](https://svelte.dev/docs/kit/page-options)
- [SvelteKit adapters](https://svelte.dev/docs/kit/adapters)
- [Svelte server rendering](https://svelte.dev/docs/svelte/svelte-server)
