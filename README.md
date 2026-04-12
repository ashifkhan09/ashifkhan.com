# ashifkhan.com

Personal website of Ashif Khan — built with [Astro](https://astro.build) and deployed via [GitHub Pages](https://pages.github.com).

## Stack

- **Framework**: Astro (static output, zero JS shipped by default)
- **Fonts**: DM Serif Display + DM Sans (Google Fonts)
- **Deployment**: GitHub Pages via GitHub Actions
- **Domain**: ashifkhan.com

## Local Development

```bash
# Install dependencies
npm install

# Start dev server at localhost:4321
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## File Structure

```
ashifkhan.com/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Auto-deploy to GitHub Pages on push to main
├── public/
│   ├── CNAME                   # Custom domain routing
│   ├── favicon.svg
│   └── resume.pdf              # Add your resume here
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro    # Nav, footer, global styles
│   ├── pages/
│   │   ├── index.astro         # Homepage
│   │   └── 404.astro           # Custom 404 page
│   └── components/             # Add reusable components here
└── astro.config.mjs
```

## Deploying to GitHub Pages

### First-time setup

1. **Create a new GitHub repo** — name it anything (e.g. `ashifkhan.com`)

2. **Push this code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
   git push -u origin main
   ```

3. **Enable GitHub Pages** in your repo:
   - Go to Settings → Pages
   - Source: **GitHub Actions**
   - Save

4. **Point your domain** at GitHub:
   - In your DNS registrar, add these records:
     ```
     Type: A     Name: @    Value: 185.199.108.153
     Type: A     Name: @    Value: 185.199.109.153
     Type: A     Name: @    Value: 185.199.110.153
     Type: A     Name: @    Value: 185.199.111.153
     Type: CNAME Name: www  Value: YOUR_USERNAME.github.io
     ```
   - The `public/CNAME` file in this repo already contains `ashifkhan.com`

5. **Wait ~5 minutes** — your site will be live at ashifkhan.com after the first GitHub Actions run.

### Ongoing workflow

Every push to `main` auto-deploys. To work on something without publishing:
```bash
git checkout -b feat/new-section
# make changes...
git push origin feat/new-section
# then open a Pull Request to merge into main when ready
```

## Customization

### Update your experience
Edit the `experience` array at the top of `src/pages/index.astro`.

### Add new pages
Create `src/pages/blog.astro`, `src/pages/projects.astro`, etc.  
Astro auto-routes files in `src/pages/` to matching URLs.

### Add a blog
1. Create `src/pages/blog/` directory
2. Add `.md` or `.mdx` files — Astro renders them automatically
3. See [Astro docs on content collections](https://docs.astro.build/en/guides/content-collections/) for organizing posts

### Add your resume PDF
Drop `resume.pdf` into the `public/` folder.  
The "Download Resume" link in the hero already points to `/resume.pdf`.

## Design System

Colors are defined as CSS variables in `BaseLayout.astro`:

| Variable | Use |
|---|---|
| `--ink` | Primary text, dark backgrounds |
| `--ink-light` | Secondary text |
| `--paper` | Main background |
| `--paper-warm` | Section alternate background |
| `--accent` | Brand orange (#c8501a) |

Fonts: **DM Serif Display** for headlines, **DM Sans** for body text.
