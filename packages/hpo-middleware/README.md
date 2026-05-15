# @threevl/hpo-middleware

Framework-agnostic HPO REST API as a **Web [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) → [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)** handler (Node 18+ / WinterTCG-style).

Use [`@threevl/hpo-express`](https://www.npmjs.com/package/@threevl/hpo-express) for an Express `Router`, or call `createHpoFetchHandler` directly from Fastify, Hono, `node:http`, etc.

## API

- `createHpoFetchHandler({ ontology, basePath?, includeHealth? })` — returns `(request: Request) => Promise<Response>`.
- `buildHpoOpenApiSpec(pathPrefix)` — OpenAPI 3.1 document; paths are `${pathPrefix}/ontology`, etc.
- `hpoOpenApiSpec` — same as `buildHpoOpenApiSpec("/api")` for the common mount layout.

`basePath` is the URL pathname prefix stripped before routing (e.g. `"/api"` when the app serves HPO under `/api/*`).
