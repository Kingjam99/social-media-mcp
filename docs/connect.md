# Connect to Publinio

| Setting | Value |
| --- | --- |
| Server URL | **https://api.publinio.com/mcp** |
| Transport | **Streamable HTTP** |
| Authentication | **OAuth** |
| Account | **Publinio account with access to the selected brands** |

Choose brand access and permissions during authorization. Begin with read access; request write, scheduling or paid-operation scopes when your workflow needs them. Never paste a Supabase token, social-provider secret or Publinio REST API key into this MCP configuration.

## ChatGPT

The current [official OpenAI guide](https://developers.openai.com/api/docs/guides/custom-mcp-server) uses ChatGPT Plugins:

1. Open ChatGPT on the web and go to Plugins.
2. Select the plus button, then **Add custom MCP server**.
3. Name it **Publinio** and enter the hosted server URL.
4. Choose **OAuth**, review the risk notice, and create the plugin.
5. Sign in to Publinio, select brands and permissions, and install the resulting plugin.
6. In a conversation, select Publinio with `@` and start with the read-only prompt below.

Availability depends on your account, workspace permissions and security restrictions. Keep automatic write approvals selective.

## Claude

Following the current [official Claude connector guide](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp):

1. For an individual account, open **Customize → Connectors → Add → Add custom connector**.
2. Name it **Publinio**, enter the server URL, and continue.
3. Review the detected OAuth settings. Use the recommended published client identity or automatic registration.
4. Connect, sign in to Publinio, and choose brands and permissions.
5. Enable the connector in the conversation and start with the read-only prompt.

For Team or Enterprise, an authorized owner/admin adds the connector in organization settings; members then connect individually. Remote Claude connectors reach Publinio from Anthropic's cloud. Local stdio configuration is a separate mechanism.

## Claude Code

The [official Claude Code MCP guide](https://code.claude.com/docs/en/mcp) documents HTTP connections:

```sh
claude mcp add --transport http publinio https://api.publinio.com/mcp
```

Run `/mcp` in Claude Code to authenticate. [config/claude-code.mcp.json](../config/claude-code.mcp.json) is an equivalent project configuration example; merge it into your existing `.mcp.json` rather than overwriting other servers.

## Other MCP clients

Add the same remote URL with Streamable HTTP and OAuth. Your client needs compatible authorization discovery and either supported client metadata, registration or a valid registered client. A JSON snippet is not a universal installation format. Use your client's documentation; never replace OAuth with an unrelated API key.

## First prompt

> Use Publinio to list my accessible brands. Ask me which brand to use, then read its approved context and connected destinations. Do not create, approve, schedule or spend credits.

For card-based workflows, ask to open the Publinio workspace. If your client does not render MCP Apps UI, use the permitted model-callable tools and review content in Publinio's web app. Four app-only controls remain reserved for the UI.

## Access management

Revoke unused MCP connections in Publinio's developer/connection settings. Requesting a new scope requires a new consent decision; existing grants do not automatically gain permissions. Request and connection allowances vary by plan.
