# ashifkhan.com — GitHub Pages Deployment Handoff

> Paste this entire file into Claude Cowork. The project folder is already open.
> Do each step in sequence. Stop and ask if you hit a permission issue or need a credential.

---

## Step 1 — Flatten the project structure

The files were extracted from a zip and may be nested inside a subfolder (e.g. `ashifkhan.com/ashifkhan.com/`).

Check the current folder structure. If the files are nested, move everything up so that the **root of the project folder** contains:

```
package.json
astro.config.mjs
tsconfig.json
.gitignore
.github/
src/
public/
README.md
```

---

## Step 2 — Initialize Git and push to GitHub

Open a terminal in the project root and run:

```bash
git init
git add .
git commit -m "Initial commit: Astro portfolio site"
```

Then:

1. Go to **github.com** and create a new **public** repository named `ashifkhan.com`
   - No README, no .gitignore, no license — completely empty
2. Copy the remote URL (HTTPS or SSH)
3. Run:

```bash
git remote add origin YOUR_REPO_URL
git branch -M main
git push -u origin main
```

---

## Step 3 — Enable GitHub Pages

1. Go to the repo on GitHub → **Settings → Pages**
2. Under **Source**, select: **GitHub Actions**
3. Click Save

---

## Step 4 — Verify the deployment workflow

1. Go to the repo → **Actions** tab
2. Wait for the **"Deploy to GitHub Pages"** workflow to complete (green checkmark)
3. If it fails, read the error log and fix the issue before continuing

---

## Step 5 — Point the domain to GitHub

Log into the registrar where **ashifkhan.com** is registered and add these DNS records:

| Type  | Name | Value                    |
|-------|------|--------------------------|
| A     | @    | 185.199.108.153          |
| A     | @    | 185.199.109.153          |
| A     | @    | 185.199.110.153          |
| A     | @    | 185.199.111.153          |
| CNAME | www  | YOUR_GITHUB_USERNAME.github.io |

> If there are existing A records for `@`, delete them first before adding the new ones.

---

## Step 6 — Set the custom domain in GitHub Pages

1. Repo → **Settings → Pages**
2. Under **Custom domain**, type: `ashifkhan.com`
3. Click **Save** — GitHub will verify DNS (may take a few minutes)
4. Once verified, check **Enforce HTTPS**

---

## Step 7 — Add the resume PDF

1. Ask the user to locate their resume file if you can't find it in the project folder
2. Rename it to `resume.pdf`
3. Place it inside the `public/` folder
4. Commit and push:

```bash
git add public/resume.pdf
git commit -m "Add resume PDF"
git push
```

---

## Step 8 — Final QA check

1. Visit **ashifkhan.com** in the browser
2. Confirm the new site loads (dark hero section, orange accent color)
3. Check all four nav links scroll correctly: About · Experience · Building · Contact
4. Resize the browser to ~375px width and confirm the mobile layout looks correct
5. Click **Download Resume** and confirm the PDF opens
6. Report back with what's live and flag anything that needs fixing

---

## Notes

- DNS propagation can take 5 min to 24 hours, but usually resolves within 15 min for GitHub Pages
- Every future change is just: edit → `git commit` → `git push` — GitHub Actions auto-deploys
- To work on changes without affecting the live site, use a branch: `git checkout -b feat/your-change`