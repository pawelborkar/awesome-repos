# Awesome Repositories: SEO, AEO, and programmatic SEO strategy

Prepared 2 November 2026 for `https://awesome.pawel.in`.

## 1. Decision and objective

Build the directory around a clear promise: **help developers choose a GitHub resource for a specific learning goal or development task, with reasons, requirements, limitations, and source links.**

Start with AI learning, Python practice, and Rust learning because these already have reviewed collections and repository annotations. Expand into agent frameworks, AI tools, and terminal tools after their source evidence is reviewed. This order reflects content readiness, not verified keyword demand.

Use SEO to acquire relevant search visitors, AEO to make the site's original guidance useful as a cited answer source, and pSEO to publish that guidance consistently from structured, reviewed records. The primary outcome is **qualified audience growth**: unique production browsers that open an original repository. This follows the objective in [ANALYTICS.md](ANALYTICS.md). Repository clicks are a discovery proxy; they do not prove learning, installation, or satisfaction.

The first 90 days should improve six existing collections and run a pSEO pilot covering 12 additional repository annotations and three existing category pages. Keep the existing URLs. Expansion depends on quality, actual indexing, and discovery outcomes.

## 2. Evidence and limits

The following is a read-only audit of the local working tree on 2 November 2026. These counts describe eligibility under the current code, **not Google's index** or the deployed version.

| Local finding | Strategic implication |
| --- | --- |
| 255 distinct repositories; 34 categories; 10 reviewed, index-eligible collections | There is already enough inventory for a focused pilot. |
| 12 repository pages meet local indexing rules; 243 do not | Add useful reviewed annotations selectively; do not enable indexing for every record. |
| Eight category pages meet local indexing rules | Prioritize categories with meaningful inventory and a distinct selection problem. |
| 252 repositories have an unclassified experience level | A technology × experience-level pSEO matrix is not supported by current data. |
| All 10 collections qualify locally, but five have no index-eligible annotated resource pages | Collection approval and repository-note approval are separate. A collection can still be useful, but deeper source verification is needed before expanding its claims. |
| 17 catalog entries are labelled `No License`; eight are labelled `Custom` | Recheck sources before making reuse claims. Homepage wording that calls the whole directory “open-source” needs review. These are catalog labels, not a new license audit. |
| Static Astro pages, canonical URLs, metadata, linked structured data, production-only indexing, sitemap, and `llms.txt` generation already exist | Preserve this foundation; spend the initial effort on evidence and decision value. |
| Search is noindex; filters use fragments; only a populated default trending view is index-eligible | Preserve this controlled URL footprint. |

The initial working-tree audit also included separate local Trending work. That feature is outside this SEO implementation branch.

Audit sources: `scripts/catalog.mjs`, `content/categories.json`, `content/resources/annotations.json`, `content/collections/`, `site/src/lib/seo.ts`, `site/src/layouts/Layout.astro`, page templates, `scripts/postbuild.mjs`, and `scripts/validate-site.mjs`.

The initial strategy audit could not retrieve production URLs from its DNS-restricted execution environment. Subsequent read-only implementation checks reached production; see [SEO-IMPLEMENTATION.md](SEO-IMPLEMENTATION.md) for the sampled HTTP/indexing baseline and current limitations. Actual crawler-IP access, Search Console settings, rankings, backlinks, traffic, and existing AI citations have not been established. Historical reports are not treated as fresh production tests.

The query phrases and priorities below are editorial hypotheses. Search volume, ranking difficulty, forecasts, and revenue projections have not been established. The plan assumes a global English-speaking developer audience and roughly 6–8 hours of editorial and engineering capacity per week; confirm capacity before setting delivery dates.

## 3. Positioning and search intent

GitHub topic pages, original documentation, and established resource lists already serve discovery. Awesome Repositories should add the decision support a list alone cannot supply: which resource to start with, prerequisites, how formats differ, what to try first, and when another choice fits better. Original documentation remains the source for current setup and product behavior.

| Reader need | Query hypothesis | Canonical destination | Added value to develop |
| --- | --- | --- | --- |
| Choose an AI learning subject | GitHub AI courses for beginners | `/discover/ai-for-beginners/` | Compare ML, general AI, generative AI, agents, and MCP; show prerequisites and possible service costs. |
| Practise Python | Python practice repositories on GitHub | `/discover/python-practice/` | Distinguish sequential challenges, examples, algorithms, patterns, and notebooks. |
| Combine Rust reading and practice | Rust books and exercises | `/discover/learn-rust/` | Explain how a book, examples, and exercises complement one another. |
| Choose terminal tools by task | GitHub command line developer tools | `/discover/command-line-workflow/` | Group by navigation, search, preview, and Git workflow; verify each role. |
| Study beyond introductory ML | machine learning GitHub learning resources | `/discover/machine-learning-deeper/` | Explain mathematical/programming prerequisites and the output of each learning format. |
| Orient a learning plan | developer roadmap GitHub resources | `/discover/developer-learning-paths/` | Distinguish roadmaps, curricula, interview preparation, and projects. |
| Browse a subject | Python GitHub repositories; Rust GitHub resources | Existing category pages | Broad topic coverage plus links into specific goal-based collections. |
| Evaluate one resource | Rustlings overview; uv Python project manager overview | Existing `/repositories/{owner}/{repo}/` | Sourced audience, practical value, requirements, limitations, and a next step. |
| Choose an agent framework | GitHub AI agent frameworks | `/categories/ai-agents/` after review | Distinguish frameworks, SDKs, applications, and resource lists before comparing them. |
| Choose an AI tool | GitHub AI developer tools | `/categories/ai-tools/` after review | Explain tool purpose and verified deployment/cost constraints without blanket license claims. |

One primary intent should have one canonical destination. “Best Python repos,” “Python practice repos,” and similar wording belong on one useful page when they describe the same selection task. A broad Python category and a Python-practice collection can coexist because their jobs differ. Do not rename established URLs just to insert keywords.

Before commissioning another page, inspect current results for its query cluster in the intended country/language and record the date, result types, competing destinations, and missing decision support. Combine this with actual Search Console queries when available. Search observations are not search-volume estimates. A comparison or “alternatives” page requires a real shared use case and substantiated differences; do not generate every possible repository pair.

## 4. SEO execution

### First establish the live baseline

The engineering owner should complete these checks before releasing pilot pages:

1. Confirm public HTTPS availability and the production domain. Inspect home, one collection, one reviewed category, one reviewed repository, an unreviewed repository, search, trending and its variants, and a nonexistent route. Check status codes and both HTML and HTTP indexing directives.
2. Verify the exact site in Google Search Console and Bing Webmaster Tools. An existing verification-code hook does not establish verified ownership. Submit the canonical sitemap and inspect representative URLs using Search Console.
3. Confirm production uses `PRODUCTION=true`; previews remain non-indexable. The ordinary local build intentionally defaults to noindex.
4. Confirm the sitemap contains only intended, canonical, indexable 200-status pages. No search results, unreviewed detail pages, empty combinations, redirects, or preview URLs.
5. Inspect CDN/WAF behavior for legitimate search crawlers. A permissive generated robots.txt does not override a challenge or access block at the edge.
6. Record 28 completed days of search impressions/clicks, qualified browser audience, landing-page repository-click conversion, and AI visibility where available. Compare with the preceding period and retain the original reporting timezone; label partial periods.

### Content and page improvements

For each of the six initial collections:

- State the selection problem and give a direct recommendation with its conditions near the beginning.
- Add a compact, source-checked comparison: resource, best-fit task, format, verified prerequisites, limitations or costs, and original source. Unknown remains unknown.
- Explain a useful starting sequence or first action. Only claim to have tested a resource when someone actually completed that check; record environment and date for hands-on observations.
- Include a few relevant questions naturally, such as “Can I use this without a paid API?” or “Should I read or do exercises first?” Answer only what the evidence supports.
- Identify the actual author/reviewer and link to a real public profile when available. Until reviewer metadata exists, retain the truthful existing review process and date; do not invent attribution.
- Link to the parent topic, useful repository notes, and a related next step. Preserve direct GitHub access.

Make titles and descriptions specific to the decision. Proposed examples, subject to editorial review:

| Existing URL | Proposed title before the site's brand suffix |
| --- | --- |
| `/discover/python-practice/` | Python Practice Repositories: Examples, Algorithms and Patterns |
| `/discover/learn-rust/` | Learn Rust with Books, Examples and Exercises |
| `/discover/ai-for-beginners/` | GitHub AI Courses for Beginners: Choose a Starting Point |
| `/discover/command-line-workflow/` | Command-Line Developer Tools by Workflow |

These are editorial titles, not claims of keyword validation. Keep the main heading aligned with the page's purpose. Write descriptions as useful summaries; avoid rigid character-count targets and repeated boilerplate. Do not add “2026” unless the content is actually maintained as a dated edition.

Review the homepage's blanket “open-source” claim. A defensible description is “curated GitHub repositories and developer resources,” with specific license information on individual resources. Revalidate questionable cost, license, and redistribution claims at the original source before highlighting them.

### Internal links and technical maintenance

Use a coherent path: home or learning/building hub → topic → goal-based collection → repository note → original source. Also link back to the collection from relevant repository notes; this needs implementation because existing related-resource selection is category-based rather than a tailored next step. Every new indexable page should have a relevant crawlable inbound link and no orphan state.

Retain trailing-slash canonical conventions, explicit permanent redirects for repository renames, real 404 responses, and content-based modification dates. Popularity refreshes should not masquerade as editorial review. For overlapping pages, first clarify their distinct jobs; consolidate genuine duplicates with an appropriate permanent redirect.

Keep filters as fragments and search results noindex. A new stable filtered landing page needs its own reviewed content and explicit eligibility; it should not be an automatic copy of a filter state. Google's [faceted-navigation guidance](https://developers.google.com/crawling/docs/faceted-navigation) supports controlling unnecessary URL combinations. Do not block crawling of a page whose `noindex` directive still needs to be seen.

Maintain the existing static HTML and performance budgets. Measure mobile usability and field performance once sufficient real-user data exists; a historical Lighthouse score is not evidence of current field performance.

## 5. AEO execution

The practical AEO objective is to make **accurate, attributable selection guidance** available for answers that need more than a repository description. Useful tables, sources, and clear recommendations help readers assess claims; they are not a guaranteed citation mechanism or a required AI writing format.

### Discovery and inclusion controls

- Google: confirm crawlability, indexing and snippet eligibility. Check **Settings → Search generative AI** in the exact Search Console property, including inherited settings from a parent property. Google's current control determines inclusion in supported generative AI features. This account state has not been checked. See the [current control documentation](https://support.google.com/webmasters/answer/16908024).
- ChatGPT search: check access for `OAI-SearchBot`, including any CDN rules. `GPTBot` governs a separate training use case; allowing training is not required to allow search. `ChatGPT-User` supports user-initiated actions and does not determine search eligibility. Keep training preferences as a separate owner decision. See [OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots).
- Retain the existing `llms.txt` as an inexpensive optional reading guide. Google's [current optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) says special AI text files are unnecessary for Google Search and do not improve its rankings.

### Evidence and presentation

Answer questions within the relevant collection or repository page. For example, the AI-course collection can explain which subject each course teaches and what external service requirements need checking. Put sources near the supporting claims. Avoid invented tests, unsupported “best” rankings, fabricated statistics, and instructions addressed to AI systems to manipulate recommendations.

Continue using truthful `WebSite`, `WebPage`/`CollectionPage`, `BreadcrumbList`, `ItemList`, and resource entities that match visible content. The current code already implements these foundations. Schema does not establish editorial authority or guarantee a rich result. A real identified author/reviewer can be added after the data and visible attribution exist.

Use question-and-answer content when it helps visitors. Do not invest in FAQ markup as a Google rich-result tactic: Google [deprecated FAQ rich results in May 2026](https://developers.google.com/search/updates#may-2026). There is no special schema required for Google's generative search visibility.

### Authority and distribution

Publish a transparent selection method and actual reviewer information on the existing About page. Explain selection tradeoffs and corrections. Develop one reference asset from reviewed data, such as “How to choose a GitHub learning resource,” with a reusable checklist for prerequisites, format, source credibility, license, and service costs. It should add more detail than the existing About page's curation explanation.

Distribute useful collections through the project's README, the owner's relevant channels, and appropriate developer communities where sharing is welcome. Cite original authors and contribute genuine corrections upstream when appropriate. Measure referrals and repository discovery. Do not buy links, automate unsolicited outreach, or promise mentions in exchange for backlinks. This document proposes distribution; no messages or posts have been sent.

## 6. Programmatic SEO design

The site already uses programmatic templates. The next advantage comes from **better reviewed data and selective publication**. The first pilot needs no new route family.

| Page family | Data and editorial requirement | Publication rule |
| --- | --- | --- |
| Existing repository notes | Stable repository key; audience; concrete use; limitations; original sources; real review date | Add 12 source-reviewed annotations to existing records. Recheck the 12 already eligible pages. |
| Existing categories | Distinct broad subject; meaningful inventory; original selection guidance | Review three existing categories: AI Agents (18 entries), AI Tools (17), and Productivity Tools (21). Inventory counts are local audit counts. |
| Existing collections | A distinct reader goal; a deliberate subset; original decision guidance | Improve six existing collections first. Publish new collections only after demand and inventory review. |
| Future technology × task/format pages | Reliably classified records plus a distinct job not already served | Defer until the pilot proves useful and the relevant fields are reviewed. |
| Pairwise comparisons / alternatives | Directly comparable products and verified differences | Editorial exceptions only, following demand review; no pairwise expansion. |
| Trending variants | Reliable snapshot coverage and a clearly different user job | Keep the current noindex policy for variants during this pilot. Do not describe the bounded candidate ranking as all of GitHub. |

### Source-of-truth contract

Keep README membership and identity, annotation JSON, category notes, and collection Markdown as the current source system. Do not manually edit generated catalog data or build output.

For future development, extend the reviewed schema with optional `reviewer`, `reviewed_at`, `use_cases`, `prerequisites`, `service_cost_notes`, and claim-level evidence. Each factual claim should be traceable to a source and review date. These fields are **proposed**, not currently supported. Reuse existing audience/value/limitations/source fields for the initial annotations without pretending they provide finer-grained data than they do.

The workflow is: propose a target from evidence → inspect original sources → classify known facts → draft selection guidance → human review → validate identity and references → render template → check HTML/indexability → publish → monitor. AI may assist extraction and drafting; `reviewed: true` must reflect actual review. Do not infer skill level, zero cost, license status, security, or compatibility from popularity or a repository name.

### Eligibility and quality gates

Existing gates are floors: categories need reviewed notes and at least five members; collections need review, at least five distinct resources, and 160 characters of body copy; repository pages need reviewed audience/value/limitations and sources. **160 characters is a code threshold, not an editorial quality standard or a search-engine rule.**

Before indexing a pilot page, also require:

1. A distinct reader decision and a mapped canonical destination; no synonymous duplicate page.
2. Source verification for material claims, including limitations and external costs. The page must add decision value beyond copied descriptions.
3. Sufficient inventory for its purpose. For categories/collections retain the existing minimum; do not pad a narrow collection to reach five. Entity pages and a genuine two-product comparison have different inventory needs.
4. Truthful review status and dates; unknown data stays unclassified.
5. Useful initial HTML without interaction; metadata and structured data reflect visible content.
6. Relevant internal links, production indexing intent, self-canonical URL, sitemap inclusion, and correct response behavior.

Assess overlap using both intent and inventory. If two pages contain almost the same resources and answer the same question, improve or consolidate one rather than publishing another. Google treats scaled production with little original value as [scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content); the risk depends on purpose and value, not merely whether templates or AI were used.

### Pilot scope and expansion decision

The content backlog identifies 12 specific unannotated repository records, six collection improvements, and three category reviews. Release repository annotations in two batches of six. Publish category notes after checking their full visible inventories; their pages may link to unannotated detail pages without making those detail pages indexable.

Review each released batch after approximately 4–6 weeks. Check whether pages were crawled, selected as canonical, indexed, and shown for relevant intents. Review discovery actions by landing-page cohort alongside reporting completeness. A locally eligible page is not guaranteed to be indexed or to rank.

Expand only when source review is sustainable, quality checks pass, and the cohort shows relevant search exposure and useful discovery. Where tracking is incomplete or traffic is too small to interpret, continue observation and improve the same cohort. Investigate persistent non-indexing before adding more pages. Pause new batches for factual errors, duplication, or declining relevance; repair those issues first. These are project operating rules, not Google thresholds.

## 7. Measurement and experiments

Use [ANALYTICS.md](ANALYTICS.md) for existing event definitions and exclusions. The local analytics implementation is not proof that capture is active in production. Validate instrumentation before treating an empty report as zero traffic.

| Measure | Definition / source | Decision |
| --- | --- | --- |
| Search-qualified audience | Distinct tracked production browsers with `resource_opened` in a session acquired from organic search | Is search growing a useful audience? Report observed browsers and capture limitations. |
| Landing-page conversion | Sessions entering on a page with at least one `resource_opened` in that session / tracked entry sessions | Does the content help readers reach original resources? Use the session-entry page, not the click page. |
| Non-branded search visibility | Search Console impressions and clicks for relevant non-branded query clusters | Which jobs and pages deserve more investment? Keep branded performance separate. |
| Google AI visibility | Impressions by page/date in Search Console's Generative AI performance report | Which pages appear in supported Google AI features? Missing reports can reflect insufficient impressions. |
| Bing AI visibility | Citations and cited pages in Bing Webmaster Tools AI Performance | Which pages appear across Microsoft's supported AI surfaces? This is not all-engine citation share. |
| Observed AI referral quality | Recognizable AI-source entry sessions and their repository-click conversion | Do visible AI referrals lead to discovery? Referrers can be absent; direct traffic is not automatically AI traffic. |
| Prompt benchmark | Runs citing this domain / valid completed runs, split by engine and prompt intent | Is observed citation presence changing in a fixed exploratory sample? Not a population estimate. |
| Indexing health | Indexed intended pilot URLs / intended submitted pilot URLs, with exclusion reasons | Is expansion technically and editorially justified? Sitemap submission alone does not establish indexing. |
| Repeat discovery | Mature W1/W4 cohorts that return; optionally also return with a repository click | Does reach turn into continued use? Only interpret mature cohorts. |

Google's [current report documentation](https://support.google.com/webmasters/answer/16984139) describes generative AI **impressions**; do not invent an AI-specific click/conversion series from it. Retain normal Search Console performance and on-site acquisition reporting separately. Native report dates use Pacific Time, so normalize daily boundaries explicitly before comparisons.

Bing's [AI Performance report](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) provides supported-surface citation data. Its [Topics Portfolio beta](https://blogs.bing.com/webmaster/2026/10/introducing-topics-portfolio-beta-in-ai-performance/) can suggest opportunities where available, but its figures are approximate and smaller sites may not have sufficient data. Do not substitute these figures for Google keyword volume.

Use the companion `aeo-prompt-benchmark.csv` for an initial monthly manual sample. Run each prompt in a fresh context with search enabled on available services, such as ChatGPT, Perplexity, and Copilot. Record engine/model, mode, date, locale, complete answer evidence, linked citations, and errors. Keep unbranded prompts and the branded accuracy control separate. A run can cite several sites; count a site at most once per run. A source fetch failure or model error is not a valid completed run. No citation is a valid observed zero. Do not automate paid runs without an agreed budget.

Initial experiments:

- Improve three of the six collections first; retain the other three temporarily as a directional comparison. Publish dates and compare matched 28-day windows once enough exposure exists, then improve the remainder. This is observational, not a randomized SEO experiment.
- Measure the first six new annotated repository pages as one cohort before the second batch. Compare indexing, relevant impressions, and discovery; do not judge success by page count.
- Review title/description changes against the page's own relevant query mix; avoid interpreting a sitewide CTR movement as proof of causation.

Do not set percentage traffic-growth promises before observing a baseline. Report absolute counts, denominators, period, attribution limits, and cohort age. Targets for the initial quarter are deliverables and evidence quality: six improved collections, 12 additional reviewed annotations, three category reviews, verified production behavior, and repeatable measurement.

## 8. Ninety-day delivery plan

Roles below are proposed responsibilities, not assignments to named people. Weeks are relative to kickoff. Suggested effort split: 50% editorial/source review, 25% engineering and measurement, 15% distribution, 10% evaluation. Reallocate if source review takes longer.

| When | Owner role | Deliverable | Completion evidence |
| --- | --- | --- | --- |
| Weeks 1–2 | Engineering + analytics | Live verification; indexing controls; sitemap; Google AI inclusion; baseline capture; audit blanket free/open-source claims | Recorded checks and account observations; known gaps labelled; validated browser events. |
| Weeks 2–4 | Editorial | Improve AI beginners, Python practice, and Rust learning collections | Source-backed recommendations, useful comparisons, first actions, truthful attribution, internal links. |
| Weeks 4–6 | Editorial + engineering | First six repository annotations; initial category source review | Reviewed records, correct eligible output, no duplicate intents, release log. |
| Weeks 6–8 | Editorial | Improve terminal workflow, deeper ML, and learning-path collections; finish category reviews | Three more improved collections; reviewed notes for AI Agents, AI Tools, Productivity Tools. |
| Weeks 8–10 | Editorial + analytics | Assess first batch; release second six annotations when ready | Cohort findings, completeness checks, corrections, and per-record source evidence. |
| Weeks 10–13 | Editorial + growth | Publish the resource-selection reference asset if it adds distinct value; distribute useful guides; evaluate pilot | Referral/discovery evidence, updated prompt sample, maintenance log, explicit expand/hold decision. |

Maintain a release log with URL, primary intent, change type, review date, publication date, cohort and measurement notes. Recheck fast-changing AI/tool claims on a proposed monthly cycle and stable educational material quarterly, with earlier checks triggered by renames, source issues, or corrections. These are review cadences, not automatic date updates.

## 9. Implementation acceptance criteria

This document defines the strategy; [SEO-IMPLEMENTATION.md](SEO-IMPLEMENTATION.md) records the current implementation, editorial approval, and deployment status. Use the existing checks appropriate to each change. Content/schema/template changes should pass the catalog tests, type checks, production build, and site validation:

```sh
npm test
npm run check
PRODUCTION=true npm run build
PRODUCTION=true npm run validate
```

The production build is a local output check, not a deployment. Follow `OPERATIONS.md` for browser/performance checks and deployment gates. After an authorized release, run `node scripts/verify-live.mjs https://awesome.pawel.in` and supplement its core-route checks with actual indexing directives, sitemap membership, CDN crawler access and relevant Search Console inspection. Automation validates structure; human source review validates claims.

Companion files: [prioritized content backlog](seo-content-backlog.csv) and [AEO prompt benchmark](aeo-prompt-benchmark.csv). Both contain proposed work or measurement definitions, not completed reviews or observed results.
