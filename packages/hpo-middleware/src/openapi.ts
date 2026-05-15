/** Build OpenAPI 3.1 paths for HPO REST routes under a URL prefix (e.g. `"/api"` or `"/api/hpo"`). */
export function buildHpoOpenApiSpec(pathPrefix: string): Record<string, unknown> {
  const p = pathPrefix.replace(/\/$/, "") || "";
  const path = (suffix: string) => `${p}${suffix}`;

  return {
    openapi: "3.1.0",
    info: {
      title: "HPO API",
      description: "REST API for querying the Human Phenotype Ontology",
      version: "1.0.0",
    },
    paths: {
      [path("/ontology")]: {
        get: {
          summary: "Get ontology metadata",
          responses: { 200: { description: "Ontology metadata" } },
        },
      },
      [path("/terms/{termId}")]: {
        get: {
          summary: "Get a term by HPO ID",
          parameters: [
            {
              name: "termId",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "HP:0000001",
            },
          ],
          responses: {
            200: { description: "Term details" },
            404: { description: "Term not found" },
          },
        },
      },
      [path("/terms/{termId}/parents")]: {
        get: {
          summary: "Get parent terms",
          parameters: [
            {
              name: "termId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "distance",
              in: "query",
              schema: { type: "integer", default: 1, minimum: 1, maximum: 50 },
            },
          ],
          responses: {
            200: { description: "Parent terms" },
            404: { description: "Term not found" },
          },
        },
      },
      [path("/terms/{termId}/children")]: {
        get: {
          summary: "Get child terms",
          parameters: [
            {
              name: "termId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "distance",
              in: "query",
              schema: { type: "integer", default: 1, minimum: 1, maximum: 50 },
            },
          ],
          responses: {
            200: { description: "Child terms" },
            404: { description: "Term not found" },
          },
        },
      },
      [path("/search")]: {
        get: {
          summary: "Search terms by name or synonym",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string", minLength: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
            },
          ],
          responses: { 200: { description: "Search results" } },
        },
      },
      [path("/health")]: {
        get: {
          summary: "Health check",
          responses: { 200: { description: "Health status" } },
        },
      },
    },
  };
}

/** OpenAPI spec for routes mounted at `/api` (typical `app.use("/api", …)` layout). */
export const hpoOpenApiSpec: Record<string, unknown> = buildHpoOpenApiSpec("/api");
