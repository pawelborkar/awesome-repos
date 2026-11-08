# SEO and AEO implementation

Status on 2 November 2026: technical changes implemented locally; C01–C06, K01–K03, A01, and R01–R06 approved by the user and applied locally (16 records). R07–R12 remain staged for cohort assessment. No deployment or analytics-account changes performed.

## Technical changes

- The homepage, learning/building hubs, collections, and repository notes form linked discovery paths. Repository notes link back to eligible collections that actually contain that resource.
- Collections support source-linked comparison rows, prerequisites, limitations, and useful questions in initial HTML. Questions are visible content; no FAQ rich-result markup is added.
- Reviewed repository notes support `prerequisites`, `service_costs`, and `first_step`. These fields do not appear for unreviewed annotations.
- Categories support a distinct description and source citations. Unreviewed category titles and descriptions are excluded from the public editorial presentation.
- Annotation, collection, and category records can retain `source_checked` separately from the human review/update date. No reviewer identity or hands-on result is invented.
- Source URLs must use HTTP(S) and cannot contain credentials. Collection comparisons reject duplicate or out-of-collection resource keys.
- The homepage, collection directory, source-link tooltip, and README no longer apply a blanket open-source/free claim to the entire catalog.
- Build validation rejects orphaned indexable pages, duplicate sitemap URLs, and canonicals containing queries or fragments, in addition to existing identity, schema, citation, and asset checks.
- A new editorial page uses its known review/update date for the first sitemap entry when the modification cache is absent. Unchanged cached content keeps its date; popularity refreshes still do not advance it.
- Live verification checks each sitemap page's response, canonical, and HTML/HTTP indexing directives; search-crawler robots rules; excluded search/detail/filter pages; the reading guide; trending data; and real 404 behavior.

## Editorial pilot and approval

`content/seo-pilot.json` contains 22 source-checked, AI-assisted drafts:

| IDs | Drafts | Release intent |
| --- | --- | --- |
| C01–C03 | AI beginners, Python practice, Rust learning collections | Initial collection improvements |
| R01–R06 | Six additional repository annotations | First repository cohort |
| C04–C06 | Terminal workflow, deeper ML, learning paths | Subsequent collection improvements |
| K01–K03 | AI Agents, AI Tools, Productivity Tools categories | After inventory/source review |
| R07–R12 | Six further repository annotations | After first-cohort assessment |
| A01 | Learning-resource selection checklist | Reference asset after distinct-intent review |

The manifest records 85 source snapshots checked on 2 November 2026. Local snapshot hashes identify the inspected text, not Git commits; a few very long list snapshots are explicitly labelled excerpts. Original sources remain authoritative and can change. These records establish automated source-check provenance, not human approval, universal compatibility, a fresh legal/license audit, or successful execution of every project.

Generate the readable review package:

```sh
npm run seo:review
```

This validates schemas, identities, comparison membership, source coverage, and draft status, then writes `reports/seo-editorial-review.html` and `.md`. Both stay outside the built site. The CI validation workflow also checks the pilot. Existing approved collections stay in place while revisions are pending; the normal build does not import the pilot manifest.

`OPERATIONS.md` requires human examination of sources before reviewed status is set. After that review, promote **only the explicitly approved IDs**. For example, the initial proposed batch is:

```sh
# Run only after a human has reviewed and approved these nine drafts:
node scripts/seo-pilot.mjs --apply --confirm-reviewed --ids=C01,C02,C03,R01,R02,R03,R04,R05,R06
```

This checks the original content digests, preserves unrelated records, writes reviewed source records, and appends `content/seo-release-log.json`. It does not deploy. A changed source record stops promotion instead of overwriting newer work. Repeating an already applied selection is rejected by the same conflict check. The review report excludes exactly matching approvals recorded in the local release log.

After promotion, run the production checks in `OPERATIONS.md`. Add the actual deployment timestamp to the release log only after that deployment succeeds; `published_at: null` means the approval has not been recorded as deployed. Do not treat simulated fixture approval as real review.

## Isolated verification of the full pilot

To test every template and all proposed content without changing actual approval status:

```sh
node tests/fixtures/seo-pilot.mjs
```

The command prints a new temporary directory. It copies source/configuration and the public event contract, links installed dependencies, and simulates the content changes only in that directory. It does not copy the real `.env`, private credentials, or caches. It writes synthetic public ingestion configuration for the browser suite's intercepted SDK checks; ordinary localhost browsing still fails the production-host gate. Its `SEO-TEST-FIXTURE.txt` explicitly says not to deploy it.

From the returned directory:

```sh
npm run check
PRODUCTION=true npm run build
PRODUCTION=true npm run validate
SEO_PILOT_FIXTURE=true npm run test:browser -- tests/browser/directory.spec.ts tests/browser/seo.spec.ts
npm run test:performance
```

The production flag here tests output rules in the isolated copy; it grants no deployment permission. Fixture browser checks cover comparison tables without JavaScript and mobile viewport containment. The normal-build checks separately verify that the unapproved reference asset is absent.

## Live baseline and remaining account checks

Public production requests were made on 2 November 2026 after the initial sandbox DNS limitation was bypassed with read-only network access. Evidence is in `reports/seo-live-baseline.json`.

| Sample | Observed state |
| --- | --- |
| Home, Python-practice collection, uv overview | 200; expected self-canonical; `index,follow` |
| AI Agents category, Python Patterns overview, search | 200; expected self-canonical; `noindex,follow` |
| Sitemap | 200; 37 URLs |
| robots.txt | 200; wildcard crawling allowed; production sitemap declared |
| Unknown route | Actual 404 |
| Trending and weekly/Python variant | 404 on the sampled deployed version; local working-tree routes exist |

These observations describe the deployed version at the time of the request. They do not establish Google indexing, actual crawler-IP access through Cloudflare, or deployment of this working tree. No robots training preferences were changed.

The PostHog connector's active project was identified as **Pomodoro**, rather than Awesome Repositories. No events from that project were queried. The project-listing tool referred to by the connector was unavailable in its exposed tool inventory. The correct Awesome Repositories project and a traffic baseline were therefore not verified, and no dashboard, billing, capture, or connection settings were changed. The existing local analytics provisioning manifest also has no verified target. This does not prove that production event capture is disabled.

Account-dependent follow-up:

1. Verify the exact Awesome Repositories property in Google Search Console and Bing Webmaster Tools; submit and inspect the sitemap.
2. Check the Google Search generative AI inclusion control and any parent-property inheritance. Use the current [Search Console control documentation](https://support.google.com/webmasters/answer/16908024).
3. Record available Google AI impressions using the [Generative AI performance report](https://support.google.com/webmasters/answer/16984139); missing or insufficient data is not zero exposure.
4. Connect or select the correct Awesome Repositories analytics project and verify production capture before calculating the baseline. Use the existing audience/conversion definitions in `ANALYTICS.md` and PostHog's [acquisition measurement guidance](https://posthog.com/docs/web-analytics/web-vs-product-analytics). Its [current changelog](https://posthog.com/docs/web-analytics/changelog) documents an AI channel; retain referring-domain detail and do not relabel direct traffic as AI.
5. Review actual crawler/WAF evidence and the discrepancy between deployed and local trending routes during the normal release process.
6. Measure the first repository cohort after a sufficient observation window before releasing R07–R12. Run the prompt benchmark manually on available search-enabled assistants and record real responses; no benchmark results have been fabricated.

Distribution remains a proposed growth activity. No community posts, emails, outreach messages, paid tools, or scheduled monitors were created.

## Pre-approval verification recorded on 2 November 2026

- 51 Node tests and 27 Python tests pass; Astro/TypeScript checks report no errors or warnings.
- The regular production build validates 332 HTML pages with 37 indexable URLs. Its local HTTP verification passes for sitemap pages, canonicals, HTML/HTTP directives, crawler rules, excluded variants, the reading guide, data, and 404 behavior.
- The isolated full pilot validates 333 HTML pages. The populated Trending fixture has 54 indexable URLs: the regular 37 plus 16 editorial pilot additions and one populated default Trending page. Without a usable Trending snapshot, that final page remains excluded.
- The populated full-pilot browser run passes 46 tests on desktop/mobile. Two normal-build-only unpublished-reference controls are intentionally skipped in this simulated-approved copy; those controls passed in the separate regular-build run (20 tests passed there).
- Mobile Lighthouse scores for home, collection, detail, and populated Trending are 100 performance / 100 SEO. Accessibility is 100 for home/collection and 96 for detail/Trending, above the repository's 95 threshold. These are local lab results, not production field Core Web Vitals.
- The mobile comparison rendering was visually inspected. At this pre-approval checkpoint, source publication records remained unchanged.

Supporting artifacts are in `reports/seo-verification.json`, `reports/seo-pilot-lighthouse-*.json`, `reports/seo-pilot-mobile.png`, and the editorial review package. Reports are local evidence, not committed source or proof of deployment.

## Approved first batch

On 2 November 2026, the user approved C01–C03 and R01–R06 after the editorial review request. Those nine records were promoted into the actual collection and annotation sources, with approval provenance in `content/seo-release-log.json`. They remain awaiting deployment; every release entry has `published_at: null`.

The three improved collections cover AI beginners, Python practice, and Rust learning. The six additional annotations cover AI Agents for Beginners, MCP for Beginners, 30 Days of Python, wtfpython, Python Patterns, and Comprehensive Rust. The original 12 annotations, all category notes, and the other seven collections were checked for preservation.

There are now 18 index-eligible repository pages and 43 indexable URLs in the local production build without a populated Trending snapshot. The second annotation cohort, three category drafts, three other collection revisions, and reference asset remain pending (13 drafts). Their eligibility has not been enabled by this approval.

The first-batch unit tests (51 Node, 27 Python), type checks, production build, 332-page validation, and all 22 targeted desktop/mobile browser tests pass. Mobile Lighthouse reports 100 performance/SEO across the four audited pages and accessibility of 96–100. The pending review report and content backlog have been refreshed to distinguish these approvals from the remaining proposals.

## Approved collections, categories, and reference guide

The user subsequently approved C04–C06, K01–K03, and A01. These seven records were applied locally: the terminal-workflow, deeper-ML, and developer-learning-path collections; the AI Agents, AI Tools, and Productivity Tools category notes; and the learning-resource selection guide. The prior annotations, first three collection revisions, other existing collections, and existing category notes were checked for preservation.

The actual production build now contains 333 HTML pages and 47 indexable URLs without a populated Trending snapshot, including 18 repository pages, 11 category guides, and 11 collections. The six second-cohort repository annotations remain excluded; their proposed source data is still retained in the pending review package. All 16 approval-log entries remain `approved-locally-awaiting-deployment` with no publication timestamp.

Unit tests (51 Node, 27 Python), type checks, production build validation, explicit sitemap membership checks, and all 24 targeted desktop/mobile browser checks pass after this promotion. The local HTTP verifier passes for all 47 sitemap pages. Mobile Lighthouse reports performance of 99–100, SEO of 100, and accessibility of 96–100 across the four required audit pages. The next repository cohort still needs the planned first-cohort observation and release decision; approval of the collection/category/reference batch did not approve R07–R12.
