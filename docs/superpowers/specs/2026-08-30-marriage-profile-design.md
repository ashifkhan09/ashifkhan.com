# /akprofile — Marriage Profile Page

Status: APPROVED — build with placeholder content, real content swapped in later.

## Decisions (locked)

1. Route: **`/akprofile`** (deliberately not `/profile`, not linked from main nav — private/unlisted link only).
2. **6 photos** in gallery.
3. Prompts: mix of a couple carried over (reframed) + new ones, written fresh — see "Prompt Concept" below.
4. Faith/personal facts: reframed in the site's own voice, not copied verbatim from the app screenshots.
5. Interactive element: yes — see "The Trail" concept below (replaces literal Hinge-style progress bar).
6. Design language: **editorial**, fully in the main site's visual system (DM Serif/DM Sans, paper/ink/orange) — this reads as *part of ashifkhan.com*, not an app-clone.
7. Photos: stored in `public/akprofile/`, rendered via Astro's `<Image>` component for build-time optimization.

## Goal

New route on ashifkhan.com: `/profile`. A standalone "marriage bio" page — like a Muzz/Hinge profile card, but as a shareable web page instead of an app screen. Distinct from the main portfolio site's PM/career framing; this is personal/faith/relationship framing.

Inspiration observed in screenshots:
- **Muzz**: photo header, prompt-style Q&A cards ("Teach me something about you...", "The one thing I'd love to know..."), stat pill rows (height/location/kids icons), faith attribute chip cloud, voice-note prompt, personality tags.
- **Hinge**: name/age/verified badge header, "About me" pill row, marriage-intentions timeline widget, "My Faith" chip grid, long-form bio paragraphs, "top 3 qualities" / "future plans" pill rows, interests + personality chip grids.

Both are **vertical scroll, card-stacked** layouts mixing: photos, short pill/chip facts, and longer prompt-answer text blocks.

## Non-goals (assumed unless you say otherwise)

- ❓ No swiping/matching mechanics — this is read-only, one-directional (you showing your profile to whoever has the link).
- ❓ No backend/database — stays a static Astro page like the rest of the site (build-time content, no CMS).
- ❓ No auth/privacy gate — assume it's a public-ish page you share a link to (unlisted, not linked from main nav) — confirm.

## Creative concept: "Field Notes" — a hiking-trail metaphor

Your own prompt answers already lean this way ("under the stars after a hike, not chaos in a club"; hiking/outdoor photos). Instead of a dating-app card stack, the page reads as a **trail journal** — one continuous path down the page, photos as waypoints, prompts as notes pinned along the trail. This gives the interactive centerpiece a real reason to exist instead of being decoration.

**The Trail** (replaces the literal Hinge progress bar):
A thin vertical line runs down the page (like the existing `.timeline` on the main site, reused/evolved), but instead of job history, its waypoint markers are relationship milestones: *Match → First conversation → First date → Meet the family → Forever*. As you scroll, an SVG path "draws itself" (stroke-dashoffset animation tied to scroll position) and each waypoint lights up when it enters view. It's the same visual grammar as your career timeline — same site, same person, different chapter — which is the whole point of doing this in-house instead of screenshotting an app.

**Section flow (top to bottom):**

1. **Trailhead (hero)**: photo, name, age, one-line tag ("Product Manager · Raleigh, NC · probably on a trail this weekend"), and a small "verified" mark styled as a wax-seal/stamp rather than a blue checkmark — cosmetic, editorial.
2. **Field stats**: a pill row (reusing `.chip`) — height, location, faith practice, kids stance, drink/smoke — kept compact and low-key, not the focal point.
3. **Waypoint 1 — first prompt + trail marker**
4. **Photo gallery ("The Route")**: 6 photos as a horizontal film-strip, scroll-snap, click any to open a full-bleed lightbox you swipe/arrow-key through — this is the "open then scroll left-right" behavior you asked for.
5. **Waypoint 2 — second prompt**, **Faith chip cloud** (reframed, editorial labels), **Waypoint 3 — third prompt**
6. **Bio**, in the same voice as the main site's About section but personal register.
7. **Waypoint 4 — "what I'm looking for"**, Interests/Personality chip grids.
8. **Trail's end**: the "Forever" waypoint lights up, CTA to reach out (mailto — no public form).

## Prompt concept (questions only — answers written together once structure is approved)

Fresh, non-cliché, trail-themed where it fits naturally (not forced everywhere):
- "Where I'm happiest" → (ties to hiking/outdoors photos)
- "What I'm building this year"
- "The kind of partner I'd hike a hard trail with"
- "Home, to me, means"
- "What my faith looks like day to day" (reframed, not a chip dump)
- "What I've learned about partnership"

We'll pick 4-6 of these (or swap) and you supply real answers once the page skeleton exists — easier to write copy against a real layout than blind.

## Technical approach — 3 options

**A. Pure Astro + CSS + vanilla JS (recommended)**
Matches existing site exactly (no new deps, same build). New `src/pages/profile.astro`, content as frontmatter-like consts (same pattern as `index.astro`'s `experience`/`skills` arrays). Lightbox gallery = small vanilla-JS component (like the existing nav/scroll-reveal script pattern already in `BaseLayout.astro`).
- ✅ Zero new dependencies, consistent with rest of codebase, fully static, cheap to maintain.
- ⚠️ You hand-edit the content arrays in the `.astro` file to update photos/prompts (same as you already do for experience).

**B. Same as A, but content pulled from a separate `src/data/profile.ts` file**
Slightly more structure — separates content from markup so it's easier to edit without touching layout code.
- ✅ Cleaner editing experience if you'll update this often.
- ⚠️ One more file to know about; marginal benefit at this size.

**C. Astro + an image/content collection (Astro Content Collections) for photos**
Drop photos into a folder, Astro auto-generates the gallery list.
- ✅ Best if photo set changes a lot.
- ⚠️ More moving parts (schema, glob loader) for what's currently a handful of photos.

**Decision: A.** New `src/pages/akprofile.astro`, content as consts in-file (same pattern as `index.astro`), no new deps. Trail-scroll animation + lightbox = vanilla JS, same style as `BaseLayout.astro`'s existing nav/reveal scripts.

## Photo storage

**Decision:** `src/assets/akprofile/*.jpg` (Astro-optimized `src/assets`, not `public/`, so `<Image>`/`getImage()` can generate resized/webp variants at build time) — actual 6 photo files to be supplied by you before implementation.

## Placeholder content strategy

Building now with placeholders, all clearly marked so they're trivial to find and swap later:

1. **Photos (6)** — generated placeholder images (simple SVG/gradient waypoint cards, labeled "Photo 1"–"Photo 6") committed to `src/assets/akprofile/`, sized/aspect-ratio correct so swapping in real photos later is a drop-in file replace, no layout changes.
2. **Prompts** — use the 6 questions drafted above, with clearly-fake placeholder answer text (e.g. "Placeholder answer — replace me").
3. **Field stats** — placeholder values (e.g. "5'10"", "North Hills", "Occasionally practising") lifted directly from your screenshots as realistic stand-ins, swappable later.
4. **Bio** — placeholder 2-3 paragraph draft in the site's voice, marked as placeholder.
5. **Trail waypoints** — ship with *Match → First conversation → First date → Meet the family → Forever* (no placeholder needed, this is structural copy, not personal content).

All placeholder text/content lives in the top-of-file consts in `akprofile.astro` (same pattern as `index.astro`), so updating later means editing one clearly-labeled block — no hunting through markup.
