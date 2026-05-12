# @threevl/hpo-api

Runnable Express server that loads an HPO `.obo` file and serves the REST API (same routes as the Docker `Dockerfile.node` image).

## CLI

```bash
npx @threevl/hpo-api
```

Environment variables:

- `HPO_OBO_PATH` — path to `hp.obo` (default `/data/hp.obo`)
- `PORT` — listen port (default `8000`)

## Programmatic

Import `main` is not exported; run via `node node_modules/@threevl/hpo-api/dist/index.js` or the `hpo-api` bin.

For embedding in your own app, use [@threevl/hpo-express](https://www.npmjs.com/package/@threevl/hpo-express) and [@threevl/hpo-lib](https://www.npmjs.com/package/@threevl/hpo-lib) instead.
