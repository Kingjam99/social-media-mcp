# Runnable examples

Install with `npm ci` using Node.js 22+. These scripts connect to the hosted Publinio MCP through the official SDK and OAuth. No API key, social-provider secret or permanent token file is needed.

Each invocation has one short-lived loopback callback on **127.0.0.1:8347**, a fresh state and PKCE. Sign in using the printed Publinio URL; tokens stay in memory. The public client metadata document identifies these examples consistently. Account/grant allowances still apply.

## Read-only discovery

```sh
npm run example -- discover
```

Lists live tool metadata and the first accessible brand page. Use returned IDs; follow a returned brand `nextCursor` in your own integration if there are more brands.

## Read saved analytics

```sh
npm run example -- analytics --brand YOUR_BRAND_ID --since 2026-10-01 --until 2026-10-07
```

Reads `get_analytics_summary` for your explicit date range (`YYYY-MM-DD`). Preserve capture times and unavailable values. No paid refresh is requested.

## Create a draft

Copy `draft.example.json` to `draft.local.json`. Replace the brand, content, platform and idempotency key with your reviewed values. You can add a returned `connectionId` and existing media IDs according to the [schema](../catalog/tools.json).

```sh
npm run example -- draft --input draft.local.json --confirm-write
```

This saves one draft and does not schedule it. Reuse its key only for retries of the same input.

## Schedule a reviewed post

Copy `schedule.example.json` to `schedule.local.json`. Replace the sample UUID, revision and timestamp with the current post you reviewed and an explicit future time including its UTC offset. Replace the idempotency key.

```sh
npm run example -- schedule --input schedule.local.json --confirm-write
```

The script first reads the post. A changed revision or already-delivering state stops the action. Approval/destination/provider rules remain enforced by Publinio. Read the returned status; a pending approval is not a scheduled delivery.

For X, review the current price in Publinio and explicitly authorize credit reservation:

```sh
npm run example -- schedule --input schedule.local.json --confirm-write --confirm-credits
```

The scripts never publish immediately. They do not automatically approve campaigns, start research or activate recurring spending.

## Check locally

```sh
npm run check
npm run check:public
```

The first command is local validation/tests. The second checks only public HTTP endpoints and metadata; it does not authenticate or invoke a tool. Live client/sign-in/publishing QA is separate.

Local request files matching `*.local.json` are ignored by Git. Keep private results out of commits. Use `--help` for the CLI syntax.
