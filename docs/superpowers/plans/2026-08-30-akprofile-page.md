# /akprofile Marriage Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new, unlisted `/akprofile` page on ashifkhan.com — an editorial "trail journal" take on a dating-app profile, built with placeholder content the user will swap in later.

**Architecture:** Single self-contained Astro page (`src/pages/akprofile.astro`), following the existing monolithic-page pattern used by `src/pages/index.astro` (data consts + markup + scoped `<style>` + a `<script>` block in one file). Reuses global primitives already defined in `src/layouts/BaseLayout.astro` (`.chip`, CSS custom properties, fonts). No new dependencies — photo optimization uses Astro's built-in `astro:assets` (`getImage`), already available since `output: 'static'` Astro 5 ships it by default.

**Tech Stack:** Astro 5 (static output), vanilla CSS (scoped `<style>` block) + vanilla JS (scroll listener, `IntersectionObserver`, touch events) — matches everything else in the repo. `sharp` (already present as Astro's internal image dependency) is used once, via a throwaway Node script, to generate 6 placeholder JPGs.

**Testing note:** This repo has no test framework (static marketing site, no `package.json` test script, no `@astrojs/check`). "Verification" in this plan means: `npm run build` completes without errors, and — for the final task — a manual look at the page in the dev server. This mirrors how the rest of the site is validated today; do not introduce a test framework for one page (YAGNI).

---

## File Structure

- **Create** `src/assets/akprofile/photo-1.jpg` … `photo-6.jpg` — placeholder photos (generated, not hand-drawn), portrait 3:4, distinct colors + "Photo N" label so the eventual real-photo swap is obviously a drop-in replace.
- **Create** `src/pages/akprofile.astro` — the entire page: data consts, hero, field stats, trail (waypoints + scroll-progress), prompt cards, photo gallery + lightbox, faith/interest/personality chip grids, bio, CTA. One file, mirroring `index.astro`.
- **Modify** `src/layouts/BaseLayout.astro` — add an optional `noindex` prop so `/akprofile` can opt out of search indexing (private-link page).

---

### Task 1: Generate 6 placeholder photos

**Files:**
- Create: `src/assets/akprofile/photo-1.jpg` through `photo-6.jpg`

- [ ] **Step 1: Create the assets directory**

Run: `mkdir -p src/assets/akprofile`

- [ ] **Step 2: Generate the 6 placeholder JPGs with sharp**

Run this from the repo root (uses `sharp`, already installed as an Astro dependency):

```bash
node -e "
const sharp = require('sharp');
const colors = ['#c8501a', '#0e0e0d', '#4a4945', '#e8773d', '#8a8880', '#f4f2ed'];
const textColors = ['#faf9f7', '#faf9f7', '#faf9f7', '#0e0e0d', '#faf9f7', '#0e0e0d'];

async function run() {
  for (let i = 0; i < 6; i++) {
    const n = i + 1;
    const svg = \`
      <svg width=\"900\" height=\"1200\" xmlns=\"http://www.w3.org/2000/svg\">
        <rect width=\"900\" height=\"1200\" fill=\"\${colors[i]}\"/>
        <text x=\"450\" y=\"600\" font-family=\"Georgia, serif\" font-size=\"64\" fill=\"\${textColors[i]}\" text-anchor=\"middle\" dominant-baseline=\"middle\">Photo \${n}</text>
      </svg>
    \`;
    await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(\`src/assets/akprofile/photo-\${n}.jpg\`);
    console.log('wrote photo-' + n + '.jpg');
  }
}
run();
"
```

Expected output: `wrote photo-1.jpg` through `wrote photo-6.jpg`, and 6 new files under `src/assets/akprofile/`.

- [ ] **Step 3: Verify the files exist**

Run: `ls -la src/assets/akprofile/`
Expected: 6 files, `photo-1.jpg` … `photo-6.jpg`, each a few KB.

- [ ] **Step 4: Commit**

```bash
git add src/assets/akprofile/
git commit -m "feat(akprofile): add placeholder photo assets"
```

---

### Task 2: Add `noindex` support to BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro:1-11` (Props interface + destructure), `src/layouts/BaseLayout.astro:25` (head, add conditional meta tag)

- [ ] **Step 1: Add the `noindex` prop**

In `src/layouts/BaseLayout.astro`, replace lines 1-11:

```astro
---
interface Props {
  title?: string;
  description?: string;
}

const {
  title = 'Ashif Khan — Senior Product Manager, AI Agent Lead',
  description = 'Senior Product Manager and AI Agent Lead at Yahoo DSP. 14+ years in AdTech and programmatic advertising. Building agentic AI systems, contextual targeting products, and yield optimization strategies.',
} = Astro.props;
---
```

with:

```astro
---
interface Props {
  title?: string;
  description?: string;
  noindex?: boolean;
}

const {
  title = 'Ashif Khan — Senior Product Manager, AI Agent Lead',
  description = 'Senior Product Manager and AI Agent Lead at Yahoo DSP. 14+ years in AdTech and programmatic advertising. Building agentic AI systems, contextual targeting products, and yield optimization strategies.',
  noindex = false,
} = Astro.props;
---
```

- [ ] **Step 2: Emit the meta tag when `noindex` is true**

In the same file, find line 25 (`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`) and add directly after it:

```astro
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    {noindex && <meta name="robots" content="noindex, nofollow" />}
```

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: build succeeds with no errors (this change is backward-compatible — `index.astro` doesn't pass `noindex`, so it defaults to `false` and nothing changes for it).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(layout): add optional noindex prop for private pages"
```

---

### Task 3: Page scaffold, data consts, and hero ("Trailhead")

**Files:**
- Create: `src/pages/akprofile.astro`

- [ ] **Step 1: Create the file with imports, image processing, data consts, and the hero section**

```astro
---
import { getImage } from 'astro:assets';
import BaseLayout from '../layouts/BaseLayout.astro';
import photo1 from '../assets/akprofile/photo-1.jpg';
import photo2 from '../assets/akprofile/photo-2.jpg';
import photo3 from '../assets/akprofile/photo-3.jpg';
import photo4 from '../assets/akprofile/photo-4.jpg';
import photo5 from '../assets/akprofile/photo-5.jpg';
import photo6 from '../assets/akprofile/photo-6.jpg';

const photoSources = [photo1, photo2, photo3, photo4, photo5, photo6];
const photos = await Promise.all(
  photoSources.map(async (src, i) => {
    const thumb = await getImage({ src, width: 480, height: 640, format: 'webp' });
    const full = await getImage({ src, width: 1400, format: 'webp' });
    return {
      thumb: thumb.src,
      full: full.src,
      alt: `Placeholder photo ${i + 1} — replace with a real photo`,
    };
  })
);

const profile = {
  name: 'Ashif Khan',
  age: 40,
  tag: 'Product Manager · Raleigh, NC · probably on a trail this weekend',
};

const fieldStats = [
  { icon: '📏', label: "5'10\"" },
  { icon: '📍', label: 'North Hills' },
  { icon: '🕌', label: 'Occasionally practising' },
  { icon: '👶', label: "Doesn't have children" },
  { icon: '🍷', label: "Doesn't drink" },
];

const prompts = [
  {
    question: "Where I'm happiest",
    answer:
      'Placeholder answer — replace me with something true about the trails, coffee shops, or quiet mornings that actually make you happy.',
  },
  {
    question: "What I'm building this year",
    answer:
      "Placeholder answer — replace me. Talk about a goal, habit, or project you're actually working on.",
  },
  {
    question: 'What my faith looks like, day to day',
    answer:
      'Placeholder answer — replace me with something specific and honest, not a chip list.',
  },
  {
    question: "What I'm looking for",
    answer:
      'Placeholder answer — replace me with what actually matters to you in a partner.',
  },
];

const faithChips = [
  'Sunni',
  'Occasionally practising',
  'Fasting',
  'Friday Prayer',
  'Only eats halal food',
  'Frequent Dua',
  'Good Akhlaq',
  'Non-smoker',
];

const interestChips = ['Hiking', 'Cycling', 'Running', 'Calisthenics', 'Boxing', 'Yoga'];

const personalityChips = ['Calm', 'Affectionate', 'Curious', 'Family-oriented', 'Adventurous'];

const bio = [
  'Placeholder bio paragraph one — replace with a couple of sentences about who you are day to day.',
  "Placeholder bio paragraph two — replace with what you're looking for and why this trail metaphor actually fits your life.",
];
---

<BaseLayout
  title="Ashif Khan"
  description="A private profile page."
  noindex={true}
>
  <!-- ── TRAILHEAD (HERO) ── -->
  <section class="trailhead">
    <div class="trailhead-photo">
      <img src={photos[0].thumb} alt={photos[0].alt} />
    </div>
    <div class="trailhead-content">
      <div class="trailhead-seal">✓</div>
      <h1 class="trailhead-name">{profile.name}, <span class="trailhead-age">{profile.age}</span></h1>
      <p class="trailhead-tag">{profile.tag}</p>
    </div>
  </section>

  <style>
    .trailhead {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 70vh;
      background: var(--ink);
    }

    .trailhead-photo {
      position: relative;
      overflow: hidden;
    }

    .trailhead-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .trailhead-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 4rem;
    }

    .trailhead-seal {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 1.5px solid var(--accent-light);
      color: var(--accent-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
    }

    .trailhead-name {
      font-family: var(--serif);
      font-size: clamp(2.5rem, 5vw, 4rem);
      color: var(--paper);
      letter-spacing: -0.02em;
      margin-bottom: 1rem;
    }

    .trailhead-age {
      color: var(--accent-light);
    }

    .trailhead-tag {
      color: rgba(250, 249, 247, 0.6);
      font-size: 1.0625rem;
      font-weight: 300;
      max-width: 40ch;
    }

    @media (max-width: 768px) {
      .trailhead {
        grid-template-columns: 1fr;
        min-height: auto;
      }
      .trailhead-photo {
        aspect-ratio: 3 / 4;
      }
      .trailhead-content {
        padding: 2.5rem 1.5rem;
      }
    }
  </style>
</BaseLayout>
```

- [ ] **Step 2: Verify the build passes and the route exists**

Run: `npm run build`
Expected: build succeeds, and `dist/akprofile/index.html` exists.

Run: `ls dist/akprofile/index.html`
Expected: file found.

- [ ] **Step 3: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): scaffold page with hero section"
```

---

### Task 4: Field stats pill row

**Files:**
- Modify: `src/pages/akprofile.astro` (add section after the `<section class="trailhead">` closing tag, inside `<BaseLayout>`)

- [ ] **Step 1: Add the field stats section**

In `src/pages/akprofile.astro`, immediately after the `</section>` that closes `.trailhead` (and before the `<style>` block), add:

```astro
  <!-- ── FIELD STATS ── -->
  <section class="field-stats">
    <div class="section field-stats-inner">
      {fieldStats.map((stat) => (
        <span class="chip field-stat-chip">
          <span class="field-stat-icon">{stat.icon}</span>
          {stat.label}
        </span>
      ))}
    </div>
  </section>
```

- [ ] **Step 2: Add the section's styles**

In the same file, inside the existing `<style>` block, add after the `.trailhead` rules (before the closing `</style>`):

```css
    /* ── FIELD STATS ── */
    .field-stats {
      background: var(--paper-warm);
      border-bottom: 1px solid var(--border);
    }

    .field-stats-inner {
      padding: 2rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .field-stat-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .field-stat-icon {
      font-size: 0.9rem;
    }
```

- [ ] **Step 3: Verify the build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add field stats pill row"
```

---

### Task 5: Trail spine — waypoint 1 + prompt 1

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Open the trail wrapper and add the first waypoint + prompt card**

Immediately after the `</section>` closing `.field-stats`, add:

```astro
  <!-- ── THE TRAIL ── -->
  <div class="trail" id="trail">
    <div class="trail-track">
      <div class="trail-progress" id="trailProgress"></div>
    </div>

    <div class="trail-waypoint" data-waypoint="match">
      <span class="trail-dot"></span>
      <span class="trail-label">Match</span>
      <div class="prompt-card">
        <p class="prompt-question">{prompts[0].question}</p>
        <p class="prompt-answer">{prompts[0].answer}</p>
      </div>
    </div>
```

Leave this `<div class="trail">` **open** — later tasks add more waypoints and content inside it, and Task 11 closes it.

- [ ] **Step 2: Add the trail + prompt card styles**

In the `<style>` block, add after the `.field-stats` rules:

```css
    /* ── TRAIL ── */
    .trail {
      position: relative;
      max-width: var(--max-w);
      margin: 0 auto;
      padding: 5rem 2rem 5rem 4rem;
      background: var(--paper);
    }

    .trail-track {
      position: absolute;
      left: 2rem;
      top: 5rem;
      bottom: 5rem;
      width: 2px;
      background: var(--border);
    }

    .trail-progress {
      position: absolute;
      left: 0;
      top: 0;
      width: 2px;
      height: 0%;
      background: var(--accent);
    }

    .trail-waypoint {
      position: relative;
      margin-bottom: 4rem;
      padding-left: 2rem;
    }

    .trail-waypoint:last-child {
      margin-bottom: 0;
    }

    .trail-dot {
      position: absolute;
      left: -2.4rem;
      top: 0.15rem;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--paper);
      border: 2px solid var(--border-med);
      transition: background 0.3s, border-color 0.3s, transform 0.3s;
    }

    .trail-waypoint.lit .trail-dot {
      background: var(--accent);
      border-color: var(--accent);
      transform: scale(1.2);
    }

    .trail-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-faint);
      margin-bottom: 1rem;
      transition: color 0.3s;
    }

    .trail-waypoint.lit .trail-label {
      color: var(--accent);
    }

    .prompt-card {
      background: var(--paper-warm);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      max-width: 60ch;
    }

    .prompt-question {
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      color: var(--ink-faint);
      margin-bottom: 0.75rem;
    }

    .prompt-answer {
      font-family: var(--serif);
      font-size: 1.375rem;
      line-height: 1.4;
      color: var(--ink);
      letter-spacing: -0.01em;
    }

    @media (max-width: 768px) {
      .trail {
        padding: 3rem 1.25rem 3rem 3rem;
      }
      .trail-track {
        left: 1.25rem;
      }
      .trail-dot {
        left: -1.65rem;
      }
      .prompt-card {
        padding: 1.5rem;
      }
      .prompt-answer {
        font-size: 1.125rem;
      }
    }
```

- [ ] **Step 3: Verify the build passes**

Run: `npm run build`
Expected: build succeeds. (Note: `trail-progress` height stays `0%` until Task 12 adds the scroll JS — that's expected at this point.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add trail spine with first waypoint and prompt"
```

---

### Task 6: Photo gallery — "The Route"

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Add the gallery markup inside the trail**

Immediately after the first `</div>` that closes the `match` waypoint (from Task 5), add:

```astro
    <div class="route">
      <p class="route-label">The Route</p>
      <div class="route-strip" id="routeStrip">
        {photos.map((photo, i) => (
          <button class="route-thumb" data-index={i} aria-label={`Open photo ${i + 1} of ${photos.length}`}>
            <img src={photo.thumb} alt={photo.alt} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
```

- [ ] **Step 2: Add the lightbox markup**

This sits **outside** the `.trail` div — add it right after the `<script>`-less end of the page, i.e. directly before the closing `</BaseLayout>` tag (which doesn't exist yet since `.trail` is still open — for now, add it directly after the `.route` block above, still inside `.trail`; it'll read correctly since it's `position: fixed` regardless of DOM nesting):

```astro
    <div class="lightbox" id="lightbox" aria-hidden="true">
      <button class="lightbox-close" id="lightboxClose" aria-label="Close">✕</button>
      <button class="lightbox-prev" id="lightboxPrev" aria-label="Previous photo">‹</button>
      <img class="lightbox-img" id="lightboxImg" src="" alt="" />
      <button class="lightbox-next" id="lightboxNext" aria-label="Next photo">›</button>
    </div>
```

- [ ] **Step 3: Add the gallery + lightbox styles**

In the `<style>` block, add after the trail/prompt-card rules:

```css
    /* ── ROUTE (GALLERY) ── */
    .route {
      margin: 0 -4rem 0 -4rem;
      padding: 0 4rem;
    }

    .route-label {
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-faint);
      margin-bottom: 1rem;
    }

    .route-strip {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: 0.5rem;
    }

    .route-thumb {
      flex: 0 0 auto;
      width: 200px;
      aspect-ratio: 3 / 4;
      border: none;
      border-radius: 10px;
      overflow: hidden;
      padding: 0;
      cursor: pointer;
      scroll-snap-align: start;
      background: var(--paper-warm);
      transition: transform 0.2s;
    }

    .route-thumb:hover {
      transform: translateY(-3px);
    }

    .route-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* ── LIGHTBOX ── */
    .lightbox {
      position: fixed;
      inset: 0;
      background: rgba(14, 14, 13, 0.94);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s;
      z-index: 200;
    }

    .lightbox.open {
      opacity: 1;
      pointer-events: auto;
    }

    .lightbox-img {
      max-width: min(90vw, 900px);
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
    }

    .lightbox-close,
    .lightbox-prev,
    .lightbox-next {
      position: absolute;
      background: none;
      border: none;
      color: var(--paper);
      font-size: 2rem;
      cursor: pointer;
      padding: 0.5rem 1rem;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .lightbox-close:hover,
    .lightbox-prev:hover,
    .lightbox-next:hover {
      opacity: 1;
    }

    .lightbox-close {
      top: 1.5rem;
      right: 1.5rem;
    }

    .lightbox-prev {
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
    }

    .lightbox-next {
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
    }

    @media (max-width: 768px) {
      .route {
        margin: 0 -1.25rem;
        padding: 0 1.25rem;
      }
      .route-thumb {
        width: 150px;
      }
    }
```

- [ ] **Step 4: Verify the build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add photo gallery and lightbox markup"
```

---

### Task 7: Lightbox interactivity (JS)

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Add the lightbox script**

Add this `<script>` block right after the `<style>` block's closing `</style>` tag (script blocks go after style in this file's convention — see how `BaseLayout.astro` does it):

```astro
<script define:vars={{ photos }}>
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const thumbs = document.querySelectorAll('.route-thumb');
  let currentIndex = 0;

  function showPhoto() {
    const photo = photos[currentIndex];
    lightboxImg.src = photo.full;
    lightboxImg.alt = photo.alt;
  }

  function openLightbox(index) {
    currentIndex = index;
    showPhoto();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function nextPhoto() {
    currentIndex = (currentIndex + 1) % photos.length;
    showPhoto();
  }

  function prevPhoto() {
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    showPhoto();
  }

  thumbs.forEach((btn, i) => btn.addEventListener('click', () => openLightbox(i)));
  closeBtn?.addEventListener('click', closeLightbox);
  nextBtn?.addEventListener('click', nextPhoto);
  prevBtn?.addEventListener('click', prevPhoto);

  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
  });

  let touchStartX = 0;
  lightboxImg?.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  lightboxImg?.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 50) prevPhoto();
    if (dx < -50) nextPhoto();
  });
</script>
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run build`
Expected: build succeeds, no errors about `define:vars` serialization (the `photos` array is plain strings/objects, which is serializable).

- [ ] **Step 3: Manual check in the dev server**

Run: `npm run dev`, open `http://localhost:4321/akprofile`, click a thumbnail in the (currently short) route strip.
Expected: lightbox opens showing the full-size placeholder image; arrow keys and the ‹ › buttons cycle photos; Escape or clicking the backdrop closes it.

Stop the dev server (Ctrl+C) after confirming.

- [ ] **Step 4: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): wire up lightbox open/close/navigate"
```

---

### Task 8: Waypoint 2 + prompt 2, faith chips, waypoint 3 + prompt 3

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Add the next waypoints and faith chip cloud**

Immediately after the `</div>` that closes `.route` (added in Task 6, right before the lightbox `<div>`), insert:

```astro
    <div class="trail-waypoint" data-waypoint="conversation">
      <span class="trail-dot"></span>
      <span class="trail-label">First conversation</span>
      <div class="prompt-card">
        <p class="prompt-question">{prompts[1].question}</p>
        <p class="prompt-answer">{prompts[1].answer}</p>
      </div>
    </div>

    <div class="faith-block">
      <p class="faith-label">My Faith</p>
      <div class="chip-grid">
        {faithChips.map((chip) => (
          <span class="chip">{chip}</span>
        ))}
      </div>
    </div>

    <div class="trail-waypoint" data-waypoint="date">
      <span class="trail-dot"></span>
      <span class="trail-label">First date</span>
      <div class="prompt-card">
        <p class="prompt-question">{prompts[2].question}</p>
        <p class="prompt-answer">{prompts[2].answer}</p>
      </div>
    </div>
```

- [ ] **Step 2: Add the faith block + chip grid styles**

In the `<style>` block, add after the route/lightbox rules:

```css
    /* ── FAITH / CHIP GRID ── */
    .faith-block {
      margin-bottom: 4rem;
    }

    .faith-label {
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-faint);
      margin-bottom: 1rem;
    }

    .chip-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      max-width: 60ch;
    }
```

- [ ] **Step 3: Verify the build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add second/third waypoints and faith chip cloud"
```

---

### Task 9: Bio section

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Add the bio section**

Immediately after the `</div>` closing the `date` waypoint (added in Task 8), insert:

```astro
    <div class="bio-block">
      <p class="bio-label">About</p>
      {bio.map((paragraph) => (
        <p class="bio-paragraph">{paragraph}</p>
      ))}
    </div>
```

- [ ] **Step 2: Add the bio styles**

In the `<style>` block, add after the `.chip-grid` rule:

```css
    /* ── BIO ── */
    .bio-block {
      margin-bottom: 4rem;
      max-width: 60ch;
    }

    .bio-label {
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-faint);
      margin-bottom: 1rem;
    }

    .bio-paragraph {
      color: var(--ink-light);
      line-height: 1.75;
      font-weight: 300;
      margin-bottom: 1rem;
    }

    .bio-paragraph:last-child {
      margin-bottom: 0;
    }
```

- [ ] **Step 3: Verify the build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add bio section"
```

---

### Task 10: Waypoint 4 + prompt 4, interests + personality chips

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Add the final content waypoint and chip grids**

Immediately after the `</div>` closing `.bio-block` (from Task 9), insert:

```astro
    <div class="trail-waypoint" data-waypoint="family">
      <span class="trail-dot"></span>
      <span class="trail-label">Meet the family</span>
      <div class="prompt-card">
        <p class="prompt-question">{prompts[3].question}</p>
        <p class="prompt-answer">{prompts[3].answer}</p>
      </div>
    </div>

    <div class="interests-block">
      <div class="faith-block">
        <p class="faith-label">Interests</p>
        <div class="chip-grid">
          {interestChips.map((chip) => (
            <span class="chip">{chip}</span>
          ))}
        </div>
      </div>
      <div class="faith-block">
        <p class="faith-label">Personality</p>
        <div class="chip-grid">
          {personalityChips.map((chip) => (
            <span class="chip">{chip}</span>
          ))}
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run build`
Expected: build succeeds. (No new CSS needed — `.interests-block` needs no rules of its own, it just groups two existing `.faith-block` elements; add this trivial rule for spacing so the two blocks aren't flush against the next waypoint:)

In the `<style>` block, add after `.bio-paragraph:last-child`:

```css
    .interests-block .faith-block:last-child {
      margin-bottom: 4rem;
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add final waypoint, interests and personality chips"
```

---

### Task 11: Trail's end — CTA, and closing the trail/page

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Add the closing waypoint + CTA, and close the trail and BaseLayout**

Immediately after the `</div>` closing `.interests-block` (from Task 10), insert, then close out the remaining open tags:

```astro
    <div class="trail-waypoint" data-waypoint="forever">
      <span class="trail-dot"></span>
      <span class="trail-label">Forever</span>
      <div class="cta-block">
        <p class="cta-text">If this trail looks like one you'd want to walk too —</p>
        <a href="mailto:ashif@ashifkhan.com" class="btn-primary">Get in touch →</a>
      </div>
    </div>
  </div>
</BaseLayout>
```

This closes: the `forever` waypoint, the `<div class="trail" id="trail">` opened in Task 5, and `</BaseLayout>`. The lightbox `<div>` (added in Task 6) remains as the last element before this closing, which is fine — it's `position: fixed`.

- [ ] **Step 2: Add the CTA styles**

In the `<style>` block, add after `.interests-block .faith-block:last-child`:

```css
    /* ── CTA ── */
    .cta-block {
      max-width: 60ch;
    }

    .cta-text {
      font-family: var(--serif);
      font-size: 1.5rem;
      color: var(--ink);
      line-height: 1.3;
      margin-bottom: 1.5rem;
    }
```

- [ ] **Step 3: Verify the full file is well-formed and builds**

Run: `npm run build`
Expected: build succeeds with no unclosed-tag errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add closing waypoint and CTA"
```

---

### Task 12: Trail scroll-progress + lit-waypoint JS

**Files:**
- Modify: `src/pages/akprofile.astro`

- [ ] **Step 1: Add the trail interactivity script**

Add this as a **second** `<script>` block, right after the lightbox `<script define:vars={{ photos }}>...</script>` block added in Task 7 (scripts can be split into multiple tags in Astro):

```astro
<script>
  const trail = document.getElementById('trail');
  const trailProgress = document.getElementById('trailProgress');

  function updateTrailProgress() {
    if (!trail || !trailProgress) return;
    const rect = trail.getBoundingClientRect();
    const total = rect.height;
    if (total <= 0) return;
    const viewed = Math.min(Math.max(window.innerHeight * 0.5 - rect.top, 0), total);
    const pct = (viewed / total) * 100;
    trailProgress.style.height = pct + '%';
  }

  window.addEventListener('scroll', updateTrailProgress, { passive: true });
  window.addEventListener('resize', updateTrailProgress);
  updateTrailProgress();

  const waypointObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('lit');
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('.trail-waypoint').forEach((el) => waypointObserver.observe(el));
</script>
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check in the dev server**

Run: `npm run dev`, open `http://localhost:4321/akprofile`, scroll down slowly.
Expected: the thin accent line inside the trail track grows as you scroll past the trailhead; each waypoint dot fills in (turns accent-colored) as its section crosses the middle of the viewport, and stays lit once passed.

Stop the dev server (Ctrl+C) after confirming.

- [ ] **Step 4: Commit**

```bash
git add src/pages/akprofile.astro
git commit -m "feat(akprofile): add scroll-driven trail progress and waypoint lighting"
```

---

### Task 13: Final responsive pass and verification

**Files:**
- Modify: `src/pages/akprofile.astro` (styles only, if issues found)

- [ ] **Step 1: Run a production build**

Run: `npm run build`
Expected: build succeeds, `dist/akprofile/index.html` present.

- [ ] **Step 2: Preview and check mobile layout**

Run: `npm run preview`, open `http://localhost:4321/akprofile` in a browser, then use browser dev tools to emulate a 375px-wide viewport.
Expected: hero stacks to one column, trail track/dots shift left correctly (already handled by the `@media (max-width: 768px)` rules added in Task 5), route strip scrolls horizontally without breaking page layout, prompt cards and chip grids don't overflow.

If anything overflows or misaligns at mobile width, fix the specific CSS rule inline (e.g., adjust the offending element's `max-width` or padding) — there's no separate task for this since it's a direct fix to what's already written.

Stop the preview server (Ctrl+C) after confirming.

- [ ] **Step 3: Confirm the page is not linked from primary navigation**

Run: `grep -rn "akprofile" src/layouts/BaseLayout.astro src/pages/index.astro`
Expected: no matches — confirms `/akprofile` stays an unlisted, share-the-link-only page as decided in the spec.

- [ ] **Step 4: Final commit (only if Step 2 required fixes)**

```bash
git add src/pages/akprofile.astro
git commit -m "fix(akprofile): responsive layout adjustments"
```

If no fixes were needed, skip this commit — Task 12's commit is the last one.

---

## Post-implementation note for the user

Every placeholder is isolated to the top-of-file consts in `src/pages/akprofile.astro` (`photos` via the `photoSources` imports, `profile`, `fieldStats`, `prompts`, `faithChips`, `interestChips`, `personalityChips`, `bio`) and the 6 files in `src/assets/akprofile/`. Swapping in real content later means: replacing the 6 JPGs (same filenames, any aspect ratio — the `getImage` calls will re-crop), and editing the const values — no markup or CSS changes required.
