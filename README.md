# Sentence Fragment Lab

An interactive prototype for an adaptive ENG 106 sentence-fragment learning loop.

## Run it

Open `index.html` in a browser, or serve the folder with any static web server:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## PWA and GitHub Pages

The site includes a web app manifest, a square brand-colored app icon, and a service worker. When served from `localhost` or HTTPS, a browser can install it as an app and cache the core learning experience for repeat visits. Learner progress is stored in the browser with `localStorage` in this prototype.

The included `.github/workflows/deploy-pages.yml` publishes the static site to GitHub Pages whenever the `main` branch changes. To publish it, create or select a GitHub repository, add this folder as the repository contents, and enable GitHub Pages using **GitHub Actions** as the source. The current local repository does not yet have a GitHub remote configured, so publication still requires the destination repository and an authorized push.

For immediate user testing, a static HTTPS host such as Netlify Drop, Vercel, or Cloudflare Pages is usually faster: upload or connect this folder and share the generated preview URL. GitHub Pages is the better long-term option if the project will already live in a GitHub repository.

## Included

- Diagnostic assessment organized by sentence-fragment principle
- Targeted mini-lessons and practice activities
- Mastery assessment with a 75% mastery threshold
- Relearning → reassessment loop when mastery is not yet demonstrated
- Browser-persisted learner event history using `localStorage`
- Downloadable HTML mastery-performance report
- Clear separation between content assets (`CONTENT`) and learner state (`state`)
- Imported source bank: `question-bank.js` contains the 208 sentence items, 25 paragraph tasks, and coverage metadata from the supplied v3 workbook
- Official BYU-Idaho logo assets are stored in `assets/`
- BYU-Idaho brand palette: Brand Blue `#006EB6`, black `#000000`, white `#FFFFFF`, gray `#949598`, with restrained supporting accents `#214491`, `#4F9ACF`, and `#A0D4ED`

## Next architecture step

The prototype keeps the data boundary small. `question-bank.js` is the content layer; it is normalized into skill and pool-specific views at runtime. The learner state adapter can later be replaced with authenticated API calls backed by a learner event store. Preserve the event shape (`type`, `detail`, `payload`, `at`) so reports can reconstruct the adaptive path.
