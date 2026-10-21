# Running Awesome Repositories

Production URL: https://awesome.pawel.in

## Local development

Use Node.js 22.12+ (Node 22 LTS in CI), npm, and Python 3.12+.

```sh
npm ci
npm run dev
```

The site is in `site/`; the README is the source of catalog membership, display names, descriptions, and licenses. Builds need no network access or credentials. Never manually edit `site/src/generated/` or `site/dist/`.

```sh
npm test
npm run check
npm run build
npm run validate
npx playwright install chromium
npm run test:browser
npm run test:performance
```

`npm run build` defaults to a non-indexable preview. Use `PRODUCTION=true npm run build` and `PRODUCTION=true npm run validate` for a production build. Browser tests use local Chrome on macOS when available; CI installs Chromium. Lighthouse tests evaluate mobile home, collection, and detail pages. Preview SEO intentionally permits the single noindex audit failure; production must score at least 95 in all three tested categories. Field Core Web Vitals need actual production traffic.

## Interface

The app uses a persistent library sidebar, compact resource rows, a focused content column, and a native mobile browse menu, inspired by [Brian Lovin](https://brianlovin.com/). Geist is self-hosted, and themes follow the system preference unless a visitor chooses an override.

Controls follow [HeroUI's design principles](https://heroui.com/en/docs/react/getting-started/design-principles): semantic action variants, visible focus, accessible names, progressive disclosure, and predictable state. The shared Astro action component exposes typed primary/secondary/tertiary variants and sm/md/lg sizes. Advanced filters sit behind More filters; text, category, sort, and list/grid controls remain available in the main toolbar. Filter state is shareable through URL fragments; the view preference is saved locally.

## Catalog and editorial content

- Add or correct resource entries in README tables following CONTRIBUTING.md. Builds merge case-insensitive repository URLs and preserve category memberships.
- Add resource annotations in `content/resources/annotations.json`: normalized `key`, `journey`, `type`, `technologies`, `level`, `audience`, `value`, `limitations`, `sources`, `updated`, and `reviewed`. Unknown levels and formats stay `unclassified`. Reviewed notes require human examination of the cited sources.
- Collection Markdown files in `content/collections/` use JSON/YAML frontmatter with `title`, `description`, `journey`, `resources`, `selection`, `updated`, and `reviewed`. Include a distinct useful introduction in the Markdown body. `reviewed: false` drafts are excluded from publication.
- Category notes live in `content/categories.json`. An indexable category needs reviewed original guidance and at least five resources. Collections need the same minimum inventory and substantial reviewed copy. Resource pages need reviewed audience, practical value, limitations, and sources.
- Avoid unsupported experience levels, free-service claims, compatibility promises, or claims of keyword search volume. The original catalog includes resources beyond the narrower automated learning-resource discovery scope.
- GitHub snapshots in `.cache/github-metadata.json` are refreshed at most daily per repository in CI. Failures retain the last successful entries, and the UI displays the check date. Missing metrics are omitted. No visitor browser receives a GitHub or Groq credential.

### Renames and modification dates

When renaming a listed repository, update its README URL and annotation key, preserve any additional category memberships, and add an explicit old-to-new repository path to `config/redirects.json`. Redirect validation rejects loops, chains, collisions, and missing targets. Keep the mapping permanently.

`.cache/content-dates.json` records a content hash and modification date per canonical URL. The CI cache preserves dates across builds. Popularity counters do not alter these dates. If the cache is unavailable, the README's latest commit date is used as the conservative baseline.

## Weekly discovery

The workflow runs Monday at **03:47 UTC / 09:17 IST**. Configure thresholds and queries in `config/curation.json`; set `GROQ_MODEL` as a repository variable to override the model.

The first run should use **Actions → Discover learning resources → Run workflow → report**. Inspect the shortlist artifact and summary. Scheduled runs use proposal mode. Manual runs and schedule runs share the same weekly limit, with a maximum of three open automation PRs across resource and editorial proposals. The week starts Monday 00:00 UTC. GitHub's scheduler is best-effort; inactive public repositories may have scheduled workflows disabled by GitHub.

```sh
python3 scripts/curate.py --mode report
python3 scripts/curate.py --mode propose
```

The workflow checks Groq model availability, screens at most 20 candidates (including an emerging allocation), and never changes providers or upgrades billing automatically. It validates exact README evidence and rejects invalid assessments. Incomplete repository identity checks, unavailable PR history, or absent GitHub credentials prevent publication. Missing AI access leaves candidates unscreened in the report.

All previous automation proposals suppress another proposal for the same repository ID, even after a rename. Closed proposals are not automatically reopened. Configured exclusions and existing issue/PR links also prevent duplicate submissions. One row is added per resource PR, with existing table order preserved and the new entry placed at its alphabetical insertion point. Existing unsorted rows are not reformatted. License ambiguity remains report-only.

### Editorial drafts

Run **Actions → Draft a curated collection** with a new slug, reader goal, and five to eight existing repository keys. Report mode writes an artifact; propose mode opens a PR if there is room under the shared three-pending cap. A single bounded Groq request drafts copy and exact source evidence.

```sh
python3 scripts/editorial.py --slug python-next-steps \
  --topic 'Choosing Python practice resources' \
  --resources 'thealgorithms/python,asabeneh/30-days-of-python,trekhleb/learn-python,satwikkansal/wtfpython,faif/python-patterns' \
  --mode report
```

Inspect every claim and source; revise the text, then set `reviewed: true` before merging. Do not publish generic keyword variants or duplicate collections. Draft copy is sanitized at rendering time as an additional safeguard.

## GitHub and Cloudflare setup

Set these in **Repository Settings → Secrets and variables → Actions**:

| Name | Kind | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Secret | Groq free-plan screening and editorial drafts |
| `CLOUDFLARE_API_TOKEN` | Secret | Scoped Cloudflare deployment API token |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Cloudflare account that owns the Worker and domain |
| `GROQ_MODEL` | Optional variable | Defaults to `qwen/qwen3.8-27b`; must be available to your Groq account |
| `PUBLIC_CF_ANALYTICS_TOKEN` | Optional variable | Public Web Analytics beacon token |
| `PUBLIC_SEARCH_CONSOLE_VERIFICATION` | Optional variable | Google URL-prefix property's HTML verification token |

Use a Cloudflare API token scoped to the target account with **Workers Scripts Edit**, **Workers Routes Edit**, and **Zone Read** for `pawel.in`. The custom domain requires that zone in the same Cloudflare account. Do not place a personal OAuth/refresh token into GitHub; use a dedicated deployment token. Enable “Allow GitHub Actions to create and approve pull requests”; the workflows create proposals but never approve or merge them.

The default-branch validation workflow gates deployment. Production rechecks the exact validated commit and refuses to deploy if a newer main commit exists. Only a validated build is uploaded, so failed checks leave the previous deployment intact. Manual production deployment also runs the build checks. Third-party PRs receive no deployment credentials; `workflow_run` only deploys successful **pushes to main**, not fork PRs.

```sh
npm run build
npx wrangler deploy --dry-run --env staging
npx wrangler deploy --env staging
# After production checks, using an authenticated Cloudflare account:
PRODUCTION=true npm run build
PRODUCTION=true npm run validate
npm run deploy
node scripts/verify-live.mjs https://awesome.pawel.in
```

Build staging without `PRODUCTION=true`. Its robots.txt and X-Robots-Tag prohibit indexing. Production is served only on `awesome.pawel.in`; the production config disables `workers.dev` and version-preview URLs. If the domain has an existing unrelated DNS record or origin, resolve it explicitly before deploying rather than replacing it blindly.

Rollback with `npx wrangler rollback --env production` to restore a previous successful Worker version. Check the deployed URL afterward. Keep metadata caches and validation reports as operational evidence, not credentials.

## Generative engine optimisation (GEO)

The static HTML is the primary source for both readers and crawlers. The home page defines the catalog and links to learning, tools, collections, and the curation policy. Reviewed resource pages expose audience, practical use, limitations, and cited sources under stable section anchors. The About page answers questions about source provenance, review, AI assistance, popularity, and costs.

Every page has connected `WebSite` and page JSON-LD identities. Directory pages use `CollectionPage` with an `ItemList` matching the initial HTML inventory and order. Resource notes identify the original repository as a `CreativeWork`, link its supplied licenses, and include citations and `lastReviewed` only for reviewed annotations. Editorial review dates come from content fields; rebuilds and star snapshots do not advance them. Do not add ratings, reviewer identities, service-cost promises, or review dates without evidence.

Builds also generate `/llms.txt`, an optional Markdown reading guide containing only canonical URLs eligible for the production sitemap. Preview builds contain no discovery links. It is a convenience for tools that read it, not an indexing requirement or a guaranteed ranking improvement. Production `robots.txt` permits crawling; preview robots and headers prevent indexing. Domain-level bot protection must also permit the crawlers you want to reach the production site.

`npm run validate` checks connected page identities, list inventories against HTML, visible citations, license links, review dates, and reading-guide/sitemap parity. Run it after both preview and production builds. Follow [Google's generative AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): useful original content, crawlable pages, and structured data that matches the content remain foundational. AI citations and rankings are not guaranteed by markup or a reading guide.

## Analytics and Search Console

Create a Cloudflare Web Analytics site for `awesome.pawel.in`, use manual beacon installation (avoid a second auto-injected beacon), and store its public site token in `PUBLIC_CF_ANALYTICS_TOKEN`. The production layout loads the deferred beacon only when configured. Review real-user performance and traffic; no measurement data is fabricated when access is unavailable.

In Google Search Console, add the URL-prefix property `https://awesome.pawel.in/`. Verify through the HTML meta tag using `PUBLIC_SEARCH_CONSOLE_VERIFICATION`, or use DNS ownership verification for a domain property. Submit `https://awesome.pawel.in/sitemap.xml` after verifying ownership. Review indexing and performance by category and collection; expand the allowlist when a page answers a distinct useful question. Search Console setup requires the owner's Google account and cannot be inferred from Cloudflare credentials.
