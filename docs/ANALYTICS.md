# Awesome Repos analytics

## Purpose and measurement

Audience growth is the primary objective. Track weekly unique browser visitors and
new/returning sessions, then check whether that audience actually discovers original
repositories. Qualified audience is weekly unique browsers with `resource_opened`.
Counts describe pseudonymous browsers, not identified people or cross-device users.

Use daily charts over the last 28 completed days, compared with the preceding period.
Weekly-active series use a rolling seven-day unique count; do not sum them to obtain
monthly visitors. Weekly retention cohorts expose W1 and W4 only after those intervals
have matured. An immature cohort, a missing SDK, or exhausted ingestion allowance is
insufficient data, never evidence of zero visitors or retention.

| Metric | Definition | Decision it supports |
| --- | --- | --- |
| Audience | Unique browsers with production `$pageview` | Is reach growing? |
| Qualified audience | Unique browsers with `resource_opened` | Is growth bringing interested visitors? |
| Repository-click conversion | Visitor sessions with an original repository click / visitor sessions | Which channels and landing pages bring useful traffic? |
| Search success | Search sessions with a subsequent selection or outbound repository click in the same session within 30 minutes | Can visitors discover resources? |
| Zero-result rate | Completed searches with zero results / completed searches | Which navigation/filter experiences need improvement? |
| W1/W4 retention | First-visit browser cohorts returning in weekly intervals | Does the directory attract repeat visits? |
| Curation health | Run outcomes, candidate progression, retries, token usage, provider latency | Is the catalog workflow reliable and bounded? |

Repository clicks do not establish learning outcomes, software quality, or GitHub
stars. Contribution-guide interest does not establish a submitted or merged PR.
AI candidate qualification is an automated assessment, not a human quality rating.

## Configuration

Basic analytics needs only two values in the ignored repository-root `.env`:

```dotenv
PUBLIC_POSTHOG_PROJECT_TOKEN=<public ingestion token>
PUBLIC_POSTHOG_HOST=https://a.awesome.pawel.in
```

Set the same two GitHub Actions repository variables for production. No organization
ID, project ID, personal API key, or provisioning manifest is required for event capture.
The project token selects the destination project. The browser bootstrap and automation
telemetry both use the token and host from the environment.

Production builds (`PRODUCTION=true`) enable capture when both values are present.
Set the optional `ANALYTICS_ENABLED=false` switch to disable it. Explicitly enabling
capture with `ANALYTICS_ENABLED=true` but missing either value fails a production
website build with a configuration error. Development and preview builds stay disabled.

`PUBLIC_POSTHOG_UI_HOST` is optional and defaults to `https://us.posthog.com` for this
US Cloud project. Exported process variables take precedence over `.env` values.
Never place a personal API key in a `PUBLIC_` variable.

The existing provisioning tool is optional administrative tooling for managed
dashboards, alerts, and additional diagnostic products. Its organization/project IDs,
personal API key, and verification manifest are independent of basic event capture.
Replay, error tracking, and OTLP logs remain disabled without their optional verified
product settings; analytics and automation events work without them.

## Collection and privacy

The existing PostHog managed proxy remains at `a.awesome.pawel.in`. Preserve its CNAME;
there is no additional analytics Worker or DNS change. See the
[managed proxy documentation](https://posthog.com/docs/advanced/proxy).

The small inline Astro bootstrap runs before interactive modules. It queues up to 100
custom actions/exceptions while the asynchronous SDK loads. All callers use the typed
helper and the versioned `.posthog-events.json` contract. SDK/capture failures cannot
block navigation, theme changes, filtering, search, or curation.

- Browser capture requires `PRODUCTION=true`, a project token and host, and the exact
  `awesome.pawel.in` hostname. `ANALYTICS_ENABLED=false` overrides configured credentials.
  Organization IDs, project IDs, and provisioning do not gate basic capture.
- Preview/development builds do not load the SDK or expose an ingestion token.
- Capture exactly one automatic pageview per document, not history/fragment changes.
  Page type and applicable repository/category/collection identifiers enrich events.
- Preserve approved `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content`
  parameters when updating filter state. Remove other query parameters before SDK
  initialization. Sanitize URL properties and strip fragments from SDK/replay URLs.
- Do not collect search text, query hashes, email/name properties, arbitrary exception
  values, prompt bodies, model outputs, console records, or network payloads/headers.
- Pseudonymous identifiers persist in origin-local storage. There are no `identify()`
  calls or shared-domain cookies. New/returning means first SDK session versus later
  sessions for that browser; clearing browser storage resets the estimate.
- Respect Do Not Track, Global Privacy Control and the persistent local opt-out.
  The production footer's **Disable analytics** button stops capture and recording.
  To re-enable later, remove `awesome-analytics-opt-out` from local storage and reload;
  browser privacy signals still take precedence. Storage denial disables collection.
- Set `awesome-analytics-internal=true` in local storage for internal browsing. All
  visitor insights exclude it, automation, test accounts and known bot classifications.
- Exceptions are replaced by bounded diagnostic kinds and safe errors; original error
  messages/rejection values never enter the error queue. Error capture additionally
  requires a verified included Error Tracking limit.

Replay starts disabled. For a verified replay allowance, a deterministic hash of the
SDK session ID selects 10% of sessions, stable across document loads. A selected
session starts recording with the SDK sampling override; unselected sessions stop.
This avoids accidentally applying two independent 10% samplers. All text/inputs are
masked, relevant attributes are masked, network records are dropped, and canvas and
console recording are off. Unknown routes do not start recording. Respect the SDK's
snapshot protocol rather than truncating or dropping snapshot arrays. See
[replay privacy controls](https://posthog.com/docs/session-replay/privacy).

The common contract is schema version 2, site, environment, release, actor type,
page type and sanitized page path. Repository events use canonical lowercase
`owner/repository` keys, never display names as identity. Search events fire after
latest-result rendering, include structured filters/counts/timing, and deduplicate
unchanged submit/blur events. Stale cancelled requests produce no event. Card,
detail, collection and related-resource links share delegated click/auxclick tracking.

Autocapture is deliberately disabled to control volume and privacy. Do not use native
bounce rate as a substitute for the explicit discovery/conversion metrics.

## Automation and dependencies

Discovery and editorial jobs share optional `Telemetry`. Unconfigured or disabled
telemetry imports no PostHog/OpenTelemetry packages. A configured SDK/exporter failure
is a bounded stderr warning and cannot change the curation result.

Each run has one start and one terminal outcome, correlated by GitHub run ID/attempt
(or a local UUID). Counts include candidates, screened/qualified candidates, proposals
and warnings. Unexpected termination is detected by the missing-heartbeat insight.
Existing provider budgets, proposal caps, exact-evidence checks and human review stay
in force.

Each provider attempt emits `$ai_generation`, with one trace per logical provider
request and a new span per attempt. Attempt latency excludes retry sleeps;
`request_elapsed_ms` and cumulative `backoff_ms` retain the logical request's elapsed
and retry waiting time separately. HTTP failures,
quota failures, malformed generation responses and timeouts are recorded. Token
counts are included only when the provider supplies valid counts. Cost status is
`unknown` unless a supported PostHog model estimator supplies an estimate; unknown
is never recorded as zero.

OTLP logs contain only fixed event names and structured telemetry metadata. They use
a process-local provider (no global logger-provider replacement), and require a verified
included Logs limit with no subscribed retention add-on. Normal and handled-error
exits flush both SDK and exporter once.

`requirements.txt` pins tested Python dependencies; every workflow installs it before
tests. Only production deployment/curation/editorial jobs receive public ingestion
configuration and the optional enable flag. Third-party validation receives none.

## Optional dashboards and diagnostics provisioning

This tooling is not needed to enable analytics. Only when managing these additional
assets, set `POSTHOG_ORGANIZATION_ID`, `POSTHOG_PROJECT_ID`, and
`POSTHOG_PERSONAL_API_KEY` in the ignored `.env`. The tool verifies the Awesome Repos
organization name, project ownership, token, included-product limits, and privacy
settings before project-scoped writes. Keep the personal key out of website builds
and GitHub Actions. Never fabricate successful checks in the manifest.

The desired state is in `scripts/analytics-blueprint.mjs`:

1. **Audience Growth:** weekly audience, qualified audience, new/returning visitors,
   channels, referring domains, campaigns, landing pages, session conversion by each
   acquisition dimension and weekly retention. Attribution uses the
   [native session-entry properties](https://posthog.com/docs/data/sessions).
2. **Discovery & Content:** search adoption, zero results/rate, session funnel and
   30-minute success, selected collections, canonical repository clicks and contribution
   guide interest.
3. **Experience & Reliability:** browser/search failures, affected sessions, 404s,
   p75 LCP/INP/CLS and links to the native 10% masked replay sample.
4. **Curation & AI:** run outcomes/duration, candidate progression, attempts/failures,
   retries, tokens, latency and estimate availability.

Supported analyses use native Trends/Funnels/Retention queries. Session conversion
and ordered search success use SQL because they require conditional/session joins.
All definitions exclude the wrong actor/environment, and use 28 completed days.
Catalog-approved exact matches with an inspectable source insight are reused;
otherwise definitions are documented as derived rather than certified. No metric is
silently approved or claimed canonical.

```sh
# Loads the ignored .env, verifies only the explicit target, and performs no writes:
npm run analytics:provision
# After reviewing that output:
npm run analytics:provision -- --apply
```

The tool validates queries before writing assets, adds a stable ownership marker,
updates only its own assets and checkpoints the manifest after each mutation.
Existing unrelated tiles, associations and dashboards remain intact. A publicly shared
owned dashboard or ambiguous ownership causes a stop rather than exposing data or
silently overwriting user work. New dashboards are not shared. Re-running is idempotent,
including recovery after an interrupted run. Never manually fill in fake verified IDs
or successful cost checks to bypass the activation guard.

### Cost boundary and current API limitations

Use the current included allowances and retention. Do not upgrade billing, enable
paid retention, add AI investigations, or create Replay Vision/scout subscriptions.
Read the target-scoped billing product/limit endpoints and require a positive included
allowance plus a zero-dollar product limit before enabling a product. Missing or
unreadable limits are not interpreted as free. Additional diagnostic products without
verified limits stay disabled. These optional provisioning checks do not gate basic analytics. Reached analytics quota disables alert activation and marks data incomplete.

The published organization-scoped billing API currently exposes limits as **read-only**
and may require feature access. If caps are missing, set $0 limits in the explicitly
verified Awesome Repos billing UI, then rerun. The tool deliberately refuses the
legacy default-organization billing endpoints. A 403, missing limit or inaccessible
target is an actual rollout blocker, not permission to change another organization.
See [billing limits](https://posthog.com/docs/billing/limits-alerts).

### In-app alerts

Use available included alert slots, preserving existing alerts, in this order:

| Alert | Completed evaluation window and condition |
| --- | --- |
| Search failures | Hourly: at least 3 failures, at least 20 attempts, failure rate over 5% |
| Browser exceptions | Hourly: at least 5 exceptions across at least 3 sessions |
| Curation failure | Hourly: at least one failed production run |
| Missing heartbeat | Daily: no successful scheduled discovery run in 8 days; only after baseline maturity |
| Audience decline | Daily: completed 7-day audience below 50% of the preceding 7 days, comparison at least 100 visitors; requires a mature, complete baseline |

At most five total alert slots are assumed, even if the account supports more. Excess
definitions remain in `pending_alerts`. Subscribe only the authenticated account after
checking Awesome Repos membership. Attach no email, Slack, webhook, report or other
destination. Verify an alert has no outbound destinations before enabling it. Native
in-app notification behavior is documented in [PostHog alerts](https://posthog.com/docs/alerts#notifications).

Baseline start is the first observed production v2 pageview, never the time someone
created a dashboard. No baseline means heartbeat/growth alerts remain disabled. The
audience-decline alert also stays disabled until `baseline_completeness_verified` is
supported by reviewed historical collection/quota evidence; event presence alone
does not prove full collection. Re-run provisioning after the 8-/14-day review to
activate eligible alerts. Never certify a window containing known quota gaps.

## Validation and rollout

```sh
npm test
npm run check
npm run build && npm run validate
npm run test:browser
npm run test:performance
```

Browser acceptance tests serve local artifacts under an intercepted production origin
with a dummy token, the installed real SDK, and mocked SDK config/ingestion. Requests
to every other origin are aborted. They do not enable production capture or transmit
test events to a real organization. Privacy/queue/session-sampling tests also run in
isolated deterministic browser doubles. Python tests mock provider/SDK transport.

Rollout order:

1. Set `PUBLIC_POSTHOG_PROJECT_TOKEN` and `PUBLIC_POSTHOG_HOST` locally and as GitHub
   Actions repository variables. Optionally set `PUBLIC_POSTHOG_UI_HOST`.
2. Remove an existing `ANALYTICS_ENABLED=false` override or set it to `true`.
3. Deploy through the validated main workflow. Verify live routing, one pageview per
   document, successful receipt in the token's project, and no search text in events.
4. Provision dashboards and diagnostic products separately if desired. They are not
   prerequisites for collecting analytics.
5. Review acquisition quality and content weekly; establish a complete 14-day baseline
   before interpreting traffic declines. Review W4 retention only after four weeks.

Rollback: set `ANALYTICS_ENABLED=false` and redeploy the static site. The same flag
disables automation telemetry. Keep DNS and the existing managed proxy unchanged.
Do not delete history, rotate unrelated keys, or modify another organization.
