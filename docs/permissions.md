# Permissions and costs

Authorization is scoped to the user, selected brands, granted scopes and applicable workspace policy. Knowing a tool name does not grant permission to execute it.

## Reads, writes and spending

| Category | Examples | Expected effect |
| --- | --- | --- |
| Saved reads | Brand context, saved posts, stored analytics/research | Reads existing data; request allowances apply |
| Draft writes | Create/edit content, prepare campaigns | Saves reviewable content |
| Approvals | Campaign/fact/sample controls | Approves an exact current revision or snapshot |
| Scheduling | Schedule post/campaign | Requests future delivery; policy and credit checks apply |
| Paid execution | Research, X report refresh, automation generation | Requires the applicable grant and credit/confirmation controls |
| Recurring work | Activate research schedules or automations | Requires reviewed cadence, timezone and spending caps |

Read permissions are distinct from write and execution permissions. Some ad-research/read operations can contact external services or update cached state; inspect each tool description and parameters rather than assuming every `get_` or `search_` name is passive.

## Scheduling

- `create_draft` and `prepare_campaign` produce drafts.
- `approve_campaign` approves a snapshot; it is an app-only control.
- `schedule_post` and `schedule_campaign` require explicit future times and current revisions/snapshots.
- Owners with an approval grant can approve and schedule the reviewed campaign in the scheduling request. Required independent member review remains enforced.
- X scheduling checks the trusted current price and available workspace credits, then reserves credits when scheduling succeeds. Insufficient credits leave content unscheduled.
- Report success from returned post states, including pending approvals or partial results. The connector does not expose an immediate publish-now tool.

The standalone scheduling example requires `--confirm-write`, checks the current saved revision, and additionally requires `--confirm-credits` for X. Review X's price in Publinio before using that flag. Server-side validation remains authoritative.

## Analytics and research

Saved analytics carry capture timestamps. Lifetime post metrics are different from daily account activity; missing values are unknown, not zero.

Reading a saved report or research run does not authorize a refresh. Research uses an expiring quote and maximum credits. Start only after accepting that exact quote. Recurring work needs separate activation and caps. Cancellation can incur costs for work already performed; only the settled receipt establishes usage/refunds.

## Limits

Account plans determine monthly requests, per-minute requests and credential/grant allowances. Credit-priced actions can incur additional costs. See [Publinio pricing](https://www.publinio.com/pricing/) and the live settings; the server's current capabilities and errors take precedence over an older documentation snapshot.
