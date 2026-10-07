# Troubleshooting

| Symptom | Next action |
| --- | --- |
| Opening the MCP URL returns 401 | Expected without OAuth; add it in a compatible MCP client and authorize |
| Missing permission / insufficient scope | Reconnect and request the required scope for the intended brands |
| Credential or request limit | Revoke an unused connection or check your plan/current allowance |
| Wrong brand or no brands | Review selected brand access and workspace membership |
| Card does not render | Refresh cached descriptors; check MCP Apps support; use the web app for review |
| Draft is not scheduled | Inspect approval, current revision, future time, connected destination and validation |
| X scheduling fails | Check current price, credits, plan/provider access and returned publishing errors |
| Analytics has missing values | Check capture dates and source coverage; do not substitute zero |
| Research still running | Poll the returned run using its suggested delay; do not start it again |
| Example cannot listen | Another process may use loopback port 8347; stop the competing example and retry |
| Example sign-in times out | Run again; the callback window lasts five minutes |
| Example cannot authorize before repo publication | Its public client metadata document must be reachable at the shipped GitHub URL |

Examples store tokens only in memory. Each run asks for sign-in and only its required scopes. Authorizations remain subject to workspace connection limits; revoke unused grants in Publinio if necessary. Local input files and returned results may contain private brand data and should stay out of commits and issue reports.

For an issue, include client/runtime versions, the tool name, a redacted error code, expected behavior and safe reproduction steps. Do not attach tokens, authorization URLs/callbacks, customer content or private identifiers.
