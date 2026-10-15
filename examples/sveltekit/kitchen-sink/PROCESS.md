# SvelteKit Kitchen-Sink: Architecture & Implementation Process

This document describes how the TinaCMS SvelteKit kitchen-sink example is structured, configured, and implemented. It is written to give developers a clear, unambiguous mental model of the system without narrative fluff.

---

## 1. Core Mental Model: How TinaCMS + SvelteKit Work

### 1.1 The Two Servers in Development
When you run `pnpm dev`, two distinct processes run together:
1. **Tina CLI Local Server**: Launches a local GraphQL server (typically on `http://localhost:4001`) that parses files in `content/` (or `examples/shared/`), validates them against the schema in `tina/config.ts`, and produces generated code in `tina/__generated__/`.
2. **SvelteKit Dev Server (Vite)**: Runs your frontend application on `http://localhost:5173`.

The command in `package.json`:
```json
"dev": "tinacms dev -c \"vite dev\""
```
tells Tina to start its GraphQL engine, keep it alive, and spawn the SvelteKit development server inside it.

---

### 1.2 The Visual Editing Flow (Iframe Architecture)
Tina's Visual Editor works by nesting your actual SvelteKit application inside an `<iframe>`:

```
┌────────────────────────────────────────────────────────┐
│ TinaCMS Admin (/admin/index.html)                      │
│ ┌──────────────────────┐  ┌──────────────────────────┐ │
│ │ Sidebar Editor Form  │  │ <iframe> of SvelteKit    │ │
│ │                      │  │                          │ │
│ │ Edit Title: [ Hello] │  │ <h1>Hello</h1>           │ │
│ │                      │  │                          │ │
│ └──────────┬───────────┘  └───────────▲──────────────┘ │
│            │ postMessage              │                │
│            └──────────────────────────┘                │
└────────────────────────────────────────────────────────┘
```

1. **Detection (`isEditMode`)**: When Tina loads your page inside the iframe, the request carries specific headers/cookies or search params indicating edit mode.
2. **Server Hook (`tinaHandle`)**: In `src/hooks.server.ts`, `tinaHandle` intercepts requests. If in edit mode, it:
   - Tracks every Tina form requested during that page render.
   - Injects the bridge script tag (`/admin/bridge.js`) into the HTML `<head>`.
3. **Bridge Handshake (`<TinaBridge />`)**: Mounted in `src/routes/+layout.svelte`. Inside the iframe, it initializes postMessage communication with the parent Tina admin window.
4. **Data Subscription (`subscribeToTinaData`)**: In the page component, Svelte 5 `$effect` listens for live field changes sent from the sidebar and updates local `$state` immediately without reloading the page.
5. **Click-to-Focus (`tinaField`)**: Elements with `data-tina-field={tinaField(doc, 'fieldName')}` inform Tina which field to focus in the sidebar when the user clicks on the page.

---

## 2. Directory Structure & Key Responsibilities

```
examples/sveltekit/kitchen-sink/
├── tina/
│   ├── config.ts              # Tina configuration (collections, schema, build outputs)
│   ├── collections/           # Schema definitions (Post, Blog, Author, Page, Global, etc.)
│   └── __generated__/         # Auto-generated GraphQL client, queries, and types
├── src/
│   ├── hooks.server.ts        # Server hook with sequence(tinaHandle)
│   ├── routes/
│   │   ├── +layout.server.ts  # Loads global site data (header, footer, theme)
│   │   ├── +layout.svelte     # Mounts <TinaBridge />, theme provider, header & footer
│   │   ├── +page.server.ts    # Loads 'home.md' page query
│   │   ├── +page.svelte       # Renders home blocks
│   │   ├── posts/             # Post list and [slug] detail routes
│   │   ├── blog/              # Blog list and [slug] detail routes
│   │   ├── authors/           # Author list and [slug] detail routes
│   │   └── tina-island/       # Runtime refresh endpoint for prerendered hybrid mode
│   └── lib/
│       ├── styles/theme.css   # Vanilla CSS custom properties & theme tokens
│       ├── utils.ts           # Safe URL sanitizers, date formatters, and helpers
│       └── components/
│           ├── layout/        # Header, Footer, Container, Section, Icon, Actions
│           ├── ui/            # GradientTitle, Badge, Card, NoData
│           ├── blocks/        # Hero, Features, CTA, Testimonial, Content, Blocks
│           └── tina/          # PageRenderer, PostDetail, BlogDetail, AuthorDetail
```

---

## 3. Styling Strategy: Vanilla CSS & Custom Properties (No Tailwind)

To keep the project clean, lightweight, and independent of Tailwind:
1. **Design Tokens in CSS Variables**: Color themes (Blue, Teal, Green, Red), font families, and spacing tokens are declared as CSS custom properties in `src/lib/styles/theme.css`.
2. **Theme Switching**: The root `<html data-theme="blue">` attribute drives semantic variables like `--theme-primary`, `--theme-surface`, and `--theme-text`.
3. **Scoped Component Styles**: Every Svelte component encapsulates its styles inside `<style>` blocks, referencing standard CSS variables.

---

## 4. Step-by-Step Implementation Roadmap

1. **Tokens & Base Styles**: Create `src/lib/styles/theme.css` with dark/light mode and semantic theme color variables.
2. **Utilities**: Implement `src/lib/utils.ts` for input sanitization (`sanitizeHref`, `sanitizeImageSrc`) and date formatting.
3. **Layout & Primitives**: Build `Container.svelte`, `Section.svelte`, `Icon.svelte`, `Actions.svelte`, `Header.svelte`, and `Footer.svelte`.
4. **Content Blocks**: Build `Hero.svelte`, `Features.svelte`, `CTA.svelte`, `Testimonial.svelte`, `Content.svelte`, and `Blocks.svelte`.
5. **Page Renderers**: Build `PageRenderer.svelte`, `PostDetail.svelte`, `BlogDetail.svelte`, and `AuthorDetail.svelte`.
6. **Routes & Server Loads**: Wire up `+layout.server.ts` (global data), `+page.server.ts` (home), and the detail routes.

---

## 5. Modern Subpath Imports (`#lib/*` vs `$lib/*`)

In SvelteKit 3, the legacy `$lib` alias is deprecated in favor of Node/Vite standard package subpath imports configured in `package.json`:

```json
"imports": {
  "#lib": "./src/lib/index.js",
  "#lib/*": "./src/lib/*",
  "#tina/*": "./tina/*",
  "#content/*": "./content/*"
}
```

**Rule**: All internal module imports must use `#lib/*` instead of `$lib/*`.

