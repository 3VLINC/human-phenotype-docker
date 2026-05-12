/** OpenAPI 3.1 document for the HPO HTTP API (paths match the standalone server layout). */
export const hpoOpenApiSpec: Record<string, unknown> = {
  openapi: "3.1.0",
  info: {
    title: "HPO API",
    description: "REST API for querying the Human Phenotype Ontology",
    version: "1.0.0",
  },
  paths: {
    "/api/ontology": {
      get: {
        summary: "Get ontology metadata",
        responses: { 200: { description: "Ontology metadata" } },
      },
    },
    "/api/terms/{termId}": {
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
    "/api/terms/{termId}/parents": {
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
    "/api/terms/{termId}/children": {
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
    "/api/search": {
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
    "/health": {
      get: {
        summary: "Health check",
        responses: { 200: { description: "Health status" } },
      },
    },
  },
};
