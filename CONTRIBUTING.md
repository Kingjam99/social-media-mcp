# Contributing

Useful contributions include setup corrections, clearer workflows, safe client examples and reproducible bug reports.

1. Fork the repository and make a focused change.
2. Install with `npm ci`.
3. Run `npm run check`; update generated docs with `npm run docs` when the public catalogue changes.
4. Explain the behavior, source/reference and checks in your pull request.

The hosted Publinio application is maintained separately. A PR here cannot enable provider access, change production billing or authorize social publication. Prefer read-only examples; expose meaningful write/spending intent.

Keep tokens, private brand/customer data, reviewer credentials and internal infrastructure out of issues, patches, fixtures and screenshots. Use clearly fictional examples. Changes to setup instructions should cite current official client documentation and distinguish tested behavior from expected compatibility.

## Catalogue maintenance

Maintainers update `catalog/tools.json` from the hosted service's public contracts, retaining visibility and input/output schemas. Record the server version and snapshot date, regenerate `docs/tools.md`, and run all checks. Live discovery remains authoritative.

## Artwork

The generated cover's prompt and export details are in [assets/README.md](assets/README.md). Publinio's brand marks should remain recognizable; the MIT software license grants no trademark endorsement.
