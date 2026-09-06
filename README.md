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

- Diagnostic assessment organized under the five source-bank skills
- Targeted guided practice, independent practice, and unseen verification
- Four initial mastery items per skill with a 75% per-skill mastery threshold
- Relearning → reassessment loop when mastery is not yet demonstrated
- Browser-persisted learner event history using `localStorage`
- Downloadable HTML mastery-performance report
- Clear separation between source content, evaluation rules, and browser-local learner state
- Imported source bank: `question-bank.js` is generated from `Grammartar_Sentence_Fragments_Item_Bank_v3.md` and contains the 208 sentence items, 25 paragraph tasks, coverage metadata, and selection guidance
- Structured classification-and-reason interactions in place of written rationale prompts
- Clickable fragment identification plus constrained revision for paragraph tasks
- Browser-local deterministic scoring for constructed responses; no LLM or external scoring calls
- Explicit `correct`, `incorrect`, and `needsReview` results with plain-language feedback
- Machine-readable item rules in `evaluation-rules.js` and a shared evaluator in `open-text-evaluator.js`
- Unseen alternate verification/mastery items when a response cannot be scored confidently
- Backward-compatible migration of the earlier browser state shape
- Official BYU-Idaho logo assets are stored in `assets/`
- BYU-Idaho brand palette: Brand Blue `#006EB6`, black `#000000`, white `#FFFFFF`, gray `#949598`, with restrained supporting accents `#214491`, `#4F9ACF`, and `#A0D4ED`
- Mastery report sections: diagnostic assessment results, completed learning interventions, mastery attempts/relearning loops, and final mastery item results

## Local evaluator tests

Serve the project, then open `tests/evaluator-tests.html`. The browser test suite covers valid, invalid, irrelevant, copied, incomplete, alternative, and uncertain responses across the local evaluator families. It also confirms that every writing task in the bank receives a local rule.

## Next architecture step

The prototype keeps the data boundary small. `question-bank.js` is the source content layer, `evaluation-rules.js` contains executable scoring metadata, and learner progress remains local to the browser. If an authenticated learner store is added later, preserve the event shape (`type`, `detail`, `payload`, `at`) so reports can reconstruct the adaptive path.
