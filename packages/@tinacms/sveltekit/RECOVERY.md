# SvelteKit package handoff

Last verified: 2026-10-14

This file is a short recovery guide for continuing the SvelteKit visual-editing
work after a context reset. Read it first, then use [PROCESS.md](./PROCESS.md)
for implementation history and manual verification steps and
[plan-v1.md](./plan-v1.md) for goals and scope.

## Objective and scope

Build `@tinacms/sveltekit` for SvelteKit 3 and Svelte 5, using the Astro
integration as a reference. The implementation and example live in:

- Package: `packages/@tinacms/sveltekit/`
- Consumer example: `examples/sveltekit/kitchen-sink/`

The shared `examples/AGENTS.md` applies to the example. Keep changes focused on
the package and this SvelteKit example unless the user authorizes a wider
change. Use pnpm for workspace commands.

## Current state

- The user verified the dev iframe flow: fields focus, unsaved edits update,
  and navigation between posts works. Ordinary page visits do not load the
  editor bridge or receive Tina form payloads.
- The package has request metadata/forms, the SvelteKit `tinaHandle`, the Vite
  bridge plugin, `TinaBridge.svelte`, `TinaMarkdown.svelte`, data subscriptions,
  and an experimental `TinaIsland.svelte` plus
  `experimental_createIslandHandler()` endpoint helper.
- The kitchen-sink post pages have Tina field metadata and prerender entries.
  The matching island POST endpoint uses the experimental package handler.
- The example has two build modes. `adapter-node` keeps the refresh endpoint
  available at runtime. `adapter-static` produces public files only and cannot
  support live island refreshes after deployment.
- Both example builds completed successfully on 2026-10-14. The package's 19
  Vitest tests, TypeScript check, and build had passed earlier in this work.

## Build commands

Run these from `examples/sveltekit/kitchen-sink/`:

| Command | Output | What it supports |
|---|---|---|
| `pnpm dev` | Vite dev server | Tina admin and visual editing during development |
| `pnpm build` | `build/` | Node server, prerendered pages, runtime island endpoint |
| `pnpm preview` | Runs `build/` | Preview the hybrid Node build |
| `pnpm build:static` | `build-static/` | Static pages only; no admin or runtime island endpoint |

The build scripts intentionally run `vite build` through
`tinacms build --local --skip-cloud-checks -c`. Tina must keep its local
GraphQL server alive while SvelteKit prerenders queries. Do not change this to
`tinacms build && vite build`: Tina exits before SvelteKit requests the post
data. `TINA_PUBLIC_IS_LOCAL=true` selects the local generated Tina client.

The static output uses `strict: false` because the Tina island POST endpoint
cannot be served by a static host. The post detail route still exports
`entries()` so its pages are generated. Static output is written separately to
`build-static/` so it does not replace the hybrid Node build.

## Main files

- Example scripts and dependencies: `examples/sveltekit/kitchen-sink/package.json`
- Adapter selection and bridge plugin: `examples/sveltekit/kitchen-sink/vite.config.ts`
- Global prerender default: `examples/sveltekit/kitchen-sink/src/routes/+layout.ts`
- Post entries and query metadata: `examples/sveltekit/kitchen-sink/src/routes/posts/[slug]/+page.server.ts`
- Post view marker: `examples/sveltekit/kitchen-sink/src/routes/posts/[slug]/+page.svelte`
- Island endpoint: `examples/sveltekit/kitchen-sink/src/routes/tina-island/[name]/+server.ts`
- Package island marker: `packages/@tinacms/sveltekit/src/TinaIsland.svelte`
- Package island request handler: `packages/@tinacms/sveltekit/src/experimental/`
- Package API/setup guide: [README.md](./README.md)

## Resume here

The next unfinished check is the **hybrid runtime edit** against the generated
Node server. From the example directory:

1. Run `pnpm build` and then `pnpm preview`.
2. Open a prerendered post from Tina's admin preview.
3. In Network, confirm the editor iframe POSTs to
   `/tina-island/post?slug=hello-world` and receives rendered HTML.
4. Change a field without saving and confirm the prerendered region updates
   from the island endpoint.
5. Open the same post as an ordinary visitor and confirm no editor payload is
   injected.

Then improve the example's scaffold `README.md` with beginner-friendly setup,
build, preview, and deployment instructions. After that, finish Goal 5 in
[plan-v1.md](./plan-v1.md): validate package exports/declarations and document
the supported adapter matrix. Do not mark the experimental island API stable
until the Node runtime check succeeds.

For package checks, run these from the monorepo root:

```sh
pnpm --filter @tinacms/sveltekit test
pnpm --filter @tinacms/sveltekit types
pnpm --filter @tinacms/sveltekit build
```

