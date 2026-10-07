# Compatibility and versions

| Component | This release |
| --- | --- |
| Integration kit | 0.1.0 |
| Catalogue server version | 1.2.1 |
| Catalogue snapshot | 2026-10-07 |
| Public descriptors | 80 |
| Model-callable tools | 76 |
| App-only controls | 4 |
| Example runtime | Node.js 22+ |
| Example SDK | @modelcontextprotocol/sdk 1.32.1 |

The kit version and hosted server version are independent. This public catalogue is a snapshot of the released contracts; the hosted service can evolve.

Use live `tools/list` for current input/output schemas and `get_workspace_capabilities` for the selected grant's access. Existing grants do not acquire new scopes automatically. Client caches may need refresh after a hosted release.

The four app-only controls are `approve_campaign`, `approve_brand_fact`, `approve_automation_sample` and `set_automation_delivery`. MCP Apps clients can invoke them through the appropriate UI; general model/CLI calls should respect their visibility.

## Verification scope

This repository has local MCP protocol integration tests, OAuth callback/permission guards, example-input checks, generated-document checks and public-content validation. CI runs those checks on Node.js 22 and 24.

The client setup guides follow current official documentation. Real assistant rendering, interactive Publinio sign-in, provider consent, live scheduling and real publishing require account-owned QA. The tests use local example data and perform no paid operation or social action.

## Registry manifest

`server.json` describes the remote hosted server using a GitHub-owned namespace. It is a publication candidate, not evidence that Publinio is listed in the official MCP Registry. Namespace authentication and registry submission are separate steps. [Official remote-only guidance](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx#remote-only-servers)
