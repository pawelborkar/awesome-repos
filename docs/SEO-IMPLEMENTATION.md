# SEO and AEO implementation

The approved SEO/AEO pilot adds source-backed selection guidance and controlled programmatic publication to Awesome Repositories. Six collection revisions, three category guides, a resource-selection reference guide, and six repository annotations are approved locally. The six second-cohort annotations remain staged. This change does not deploy the site.

## Content and discovery

- Home and learning/building hubs link to guided collections. Collections link to relevant topics and overlapping collections; repository notes link back to eligible collections that contain them.
- Collection comparison tables show a resource’s purpose, prerequisites, limitations, and original sources in initial HTML. Questions are visible editorial content; no FAQ rich-result markup is added.
- Reviewed repository annotations support `prerequisites`, `service_costs`, and `first_step`. Unreviewed fields remain excluded from public notes and classification.
- Reviewed categories support a distinct description and source citations. Unreviewed titles and descriptions are excluded from the editorial presentation.
- Source URLs use HTTP(S) without credentials. Comparison rows reject duplicate keys and resources outside their collection.
- The homepage, collection directory, source-link tooltip, and README avoid blanket free/open-source claims about the entire catalog.
- No reviewer identity, successful hands-on execution, keyword volume, ranking guarantee, or learning outcome is invented.

## Publication state

| Records | State | Content |
| --- | --- | --- |
| C01–C06 | Approved locally | AI beginners, Python practice, Rust learning, terminal workflow, deeper ML, developer learning paths |
| K01–K03 | Approved locally | AI Agents, AI Tools, Productivity Tools |
| A01 | Approved locally | How to choose a GitHub learning resource |
| R01–R06 | Approved locally | AI Agents for Beginners, MCP for Beginners, 30 Days of Python, wtfpython, Python Patterns, Comprehensive Rust |
| R07–R12 | Staged | Second repository cohort; requires the first-cohort assessment and human review |

The approved sources are in `content/collections/`, `content/categories.json`, and `content/resources/annotations.json`. The prior annotations, other collections, and existing category notes were checked for preservation during promotion. `content/seo-release-log.json` records 16 approvals with `published_at: null`; approval is not evidence of deployment.

The current production build has 18 index-eligible repository pages, 11 category guides, and 11 collections, with 47 indexable URLs in total. This describes local eligibility, not Google’s index. Separate local Trending work is outside this branch.

## Editorial review and promotion

`content/seo-pilot.json` retains the original 22 AI-assisted proposals and 85 source-check records dated 2 November 2026. Snapshot hashes identify the inspected local text, not Git commits. A few long-list snapshots are explicitly labelled excerpts. Original sources remain authoritative and can change. A source-check record is not human approval, a fresh legal/license audit, or a successful execution test.

Generate the pending review package:

```sh
npm run seo:review
```

This validates schemas, identities, inventory, comparison membership, source coverage, and draft status. It writes `reports/seo-editorial-review.html` and `.md`, outside the website output. Records already approved with matching draft hashes are excluded from the pending report. The normal site build does not import the proposal manifest, so pending revisions do not replace approved collections.

`OPERATIONS.md` requires human examination of sources before setting reviewed status. After the cohort decision and human review, promote only explicitly approved IDs:

```sh
# Example syntax only; do not approve the second cohort automatically.
node scripts/seo-pilot.mjs --apply --confirm-reviewed --ids=R07
```

Promotion detects changes to the original content, preserves unrelated records, requires explicit IDs and review confirmation, and appends the local approval log. A repeated or stale promotion is rejected. The writer preflights files and restores its own writes if a later write fails. It does not deploy or infer a reviewer identity.

After an authorized deployment succeeds, record its actual publication timestamp in the release log. Do not fill `published_at` based solely on a build, approval, or simulated test fixture.

## Indexing and modification dates

Build validation checks sitemap eligibility, canonical paths, matching visible structured-data inventories and citations, internal links, real page identities, redirects, preview indexing policy, and asset budgets. It additionally rejects duplicate sitemap URLs, query/fragment canonicals, and indexable pages without an inbound HTML link.

New editorial pages use their known review/update date for the first sitemap entry when no cache exists. Unchanged cached content keeps its modification date. Popularity counters remain excluded from the content fingerprint.

`source_checked` is separate from the human editorial update date. Unknown experience levels and cost requirements stay unknown; indexing is enabled only through the existing reviewed-content rules.

The live verifier checks every sitemap URL for a 200 response, the expected canonical, and non-conflicting HTML/HTTP indexing directives. It checks search-crawler robots rules, excluded search/unreviewed-detail pages, the reading guide, and actual 404 responses. These checks do not prove crawler-IP access through a CDN or Google indexing.

## Verification

Run the repository checks from this branch without a real `.env` or production credentials:

```sh
npm test
npm run seo:review
npm run check
npm run build
npm run validate
PRODUCTION=true npm run build
PRODUCTION=true npm run validate
npm run test:browser
npm run test:performance
```

Browser analytics tests inject a dummy token and mock host only into intercepted HTML. This makes fresh-checkout validation independent of environment configuration while keeping application analytics settings unchanged. Browser checks cover both desktop and mobile, comparison tables without JavaScript, reference-guide publication status, and the new category/reference pages’ viewport containment.

For local HTTP verification, start `node scripts/serve.mjs`, then run:

```sh
node scripts/verify-live.mjs http://127.0.0.1:4937
```

After an authorized release, verify the actual production origin with the same script. Local and lab results do not establish production field Core Web Vitals.

## Isolated full-pilot fixture

To exercise all proposed content without changing actual approval state:

```sh
node tests/fixtures/seo-pilot.mjs
```

The command prints a new temporary directory. It copies source/configuration and the public event contract, links installed dependencies, and simulates approval only inside that directory. It does not copy `.env`, private credentials, or caches. Its `SEO-TEST-FIXTURE.txt` explicitly says not to deploy it. Run the build, validation, browser, and performance commands above from the printed directory.

## Account-dependent work and measurement

No Search Console or Bing Webmaster property settings were changed. Verify the exact site property, sitemap, Google generative AI inclusion setting and inheritance, and available AI visibility reports before claiming account-side completion. Use the [current Google inclusion-control documentation](https://support.google.com/webmasters/answer/16908024) and [generative AI impressions report](https://support.google.com/webmasters/answer/16984139).

The available PostHog connection identified a different active project, so no event data was queried and no analytics baseline was fabricated. Verify the exact Awesome Repositories project and production capture before using the definitions in `ANALYTICS.md`. No dashboard, billing, capture, or connection settings were changed.

After deployment, observe the first repository cohort before deciding whether to publish R07–R12. The prompt benchmark remains a measurement definition until real responses are recorded. No community posts, emails, outreach, paid tools, scheduled monitors, or fabricated citation results were created by this implementation.

## Branch validation recorded on 2 November 2026

Validation on the `develop` base passes 40 Node tests, 27 Python tests, all 40 desktop/mobile browser tests, and Astro/TypeScript checks with no errors or warnings. Preview and production builds validate 309 HTML pages. Production publishes 47 locally indexable URLs; local HTTP verification checks every sitemap URL and the intended exclusions. Mobile Lighthouse meets the repository's 95 threshold: performance 99–100, accessibility 96–100, and SEO 100 for home, collection, and detail pages. These are local lab results, not deployment or production field-performance evidence.
