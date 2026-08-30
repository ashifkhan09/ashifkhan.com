# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # dev server at localhost:4321
npm run build        # production build → dist/
npm run preview      # preview the production build locally
```

There is no test runner or linter configured.

## Architecture

**Framework**: Astro 5 with static output (`output: 'static'`). React is used only for interactive islands via `client:load`. Zero JS is shipped by default on Astro-only pages.

**Routing**: Astro file-based routing. Every `.astro` file under `src/pages/` maps directly to a URL. No dynamic routes exist.

**Single shared layout**: `src/layouts/BaseLayout.astro` wraps every page. It owns the fixed nav, footer, all global CSS (including CSS custom properties), scroll-aware nav behaviour, mobile menu, and scroll-reveal via IntersectionObserver.

### CSS design tokens (defined in `BaseLayout.astro`)

| Variable | Value / Use |
|---|---|
| `--ink` | `#0e0e0d` — primary text, dark backgrounds |
| `--ink-light` | `#4a4945` — secondary text |
| `--ink-faint` | `#8a8880` — tertiary / label text |
| `--paper` | `#faf9f7` — main background |
| `--paper-warm` | `#f4f2ed` — alternate section background |
| `--accent` | `#c8501a` — brand orange |
| `--accent-light` | `#e8773d` |
| `--max-w` | `1120px` — content width cap |

Fonts: **DM Serif Display** (headlines) and **DM Sans** (body), loaded from Google Fonts in `BaseLayout.astro`.

### Nav link resolution

`BaseLayout.astro` detects whether the current page is home (`pathname === '/'`) and resolves anchor links accordingly — `#about` on the homepage, `/#about` everywhere else. When adding new nav links, follow the same `h(anchor)` helper pattern.

### Content data

Portfolio content (experience entries, skills groups) lives as plain TypeScript arrays at the top of `src/pages/index.astro` inside the frontmatter fence (`---`). To update bio content, edit those arrays directly.

## CareerCraft feature (`/careercraft`)

A three-page multi-step wizard backed by an external API.

**User flow**:
1. `/careercraft` — Upload resume (PDF/DOCX) + enter target role → `UploadZone.tsx`
2. `/careercraft/session` — Conversational interview to extract impact metrics → `ChatWindow.tsx`
3. `/careercraft/output` — Review confirmed facts, generate outputs → `FactReview.tsx`

**Client-side parsing**: PDFs and DOCX files are parsed entirely in the browser (`src/lib/careercraft/pdf-parser.ts`) using `pdfjs-dist` and `mammoth`. No file bytes are sent to the server — only extracted text.

**API layer** (`src/lib/careercraft/api.ts`): All backend calls go through this single file. The base URL is `PUBLIC_API_URL` env var (falls back to `https://api.ashifkhan.com`). All calls use `fetchWithTimeout` with per-endpoint timeouts (15–90 s). To test locally, set `PUBLIC_API_URL` to the local `wrangler dev` URL.

**Session model**: The backend maintains a `Session` object with phases: `upload → analysis → interview → review → generate → done`. The frontend navigates between pages based on session state stored in `sessionStorage` (keyed by `sessionId`).

**DOCX generation** (`src/lib/careercraft/docx-writer.ts`): Resume download is generated client-side using the `docx` package.

## Markets page (`/markets`)

Entirely static — no API calls. All charts are TradingView embed widgets injected via `<script>` tags with inline JSON config. The live clock and NYSE/NSE market-open status are computed client-side in a `setInterval` loop. To add or change a chart, copy an existing `tradingview-widget-container` block and update the JSON symbol.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`, which builds with Node 22 and deploys to GitHub Pages. The `PUBLIC_API_URL` secret must be set in the repo's GitHub Actions secrets for CareerCraft to connect to the production API. The custom domain is set via `public/CNAME` (`ashifkhan.com`).
