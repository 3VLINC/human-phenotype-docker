"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { parseObo, getAncestors, getDescendants } = require("./obo-parser");

const HPO_OBO_PATH = process.env.HPO_OBO_PATH || "/data/hp.obo";
const PORT = parseInt(process.env.PORT || "8000", 10);

let ontology = null;

function loadOntology() {
  if (!fs.existsSync(HPO_OBO_PATH)) {
    console.error(`Ontology file not found: ${HPO_OBO_PATH}`);
    console.error("Mount your .obo file into the container at /data/hp.obo");
    process.exit(1);
  }

  console.log(`Loading ontology from ${HPO_OBO_PATH}...`);
  const start = Date.now();
  const text = fs.readFileSync(HPO_OBO_PATH, "utf-8");
  ontology = parseObo(text);
  const elapsed = Date.now() - start;
  console.log(
    `Loaded ${ontology.terms.size} terms in ${(elapsed / 1000).toFixed(1)}s`
  );
}

const app = express();

const openApiSpec = {
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

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get("/api/ontology", (_req, res) => {
  res.json({
    name: "Human Phenotype Ontology",
    data_version: ontology.header.dataVersion || null,
    term_count: ontology.terms.size,
  });
});

app.get("/api/terms/:termId", (req, res) => {
  const term = ontology.terms.get(req.params.termId);
  if (!term) {
    return res
      .status(404)
      .json({ detail: `Term ${req.params.termId} not found` });
  }

  const parents = getAncestors(
    ontology.terms,
    ontology.parentMap,
    term.id,
    1
  );
  const children = getDescendants(
    ontology.terms,
    ontology.childrenMap,
    term.id,
    1
  );

  res.json({
    id: term.id,
    name: term.name,
    definition: term.definition,
    comment: term.comment,
    synonyms: term.synonyms,
    xrefs: term.xrefs,
    is_obsolete: term.isObsolete,
    parents,
    children,
  });
});

app.get("/api/terms/:termId/parents", (req, res) => {
  const term = ontology.terms.get(req.params.termId);
  if (!term) {
    return res
      .status(404)
      .json({ detail: `Term ${req.params.termId} not found` });
  }

  const distance = Math.min(
    Math.max(parseInt(req.query.distance || "1", 10) || 1, 1),
    50
  );
  const parents = getAncestors(
    ontology.terms,
    ontology.parentMap,
    term.id,
    distance
  );
  res.json(parents);
});

app.get("/api/terms/:termId/children", (req, res) => {
  const term = ontology.terms.get(req.params.termId);
  if (!term) {
    return res
      .status(404)
      .json({ detail: `Term ${req.params.termId} not found` });
  }

  const distance = Math.min(
    Math.max(parseInt(req.query.distance || "1", 10) || 1, 1),
    50
  );
  const children = getDescendants(
    ontology.terms,
    ontology.childrenMap,
    term.id,
    distance
  );
  res.json(children);
});

app.get("/api/search", (req, res) => {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ detail: "Query parameter 'q' is required" });
  }

  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "20", 10) || 20, 1),
    100
  );
  const queryLower = q.toLowerCase();
  const results = [];

  for (const term of ontology.terms.values()) {
    if (term.isObsolete) continue;

    let matched = false;
    if (term.name && term.name.toLowerCase().includes(queryLower)) {
      matched = true;
    }

    if (!matched) {
      for (const syn of term.synonyms) {
        if (syn.text.toLowerCase().includes(queryLower)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      results.push({ id: term.id, name: term.name });
      if (results.length >= limit) break;
    }
  }

  res.json({ query: q, count: results.length, terms: results });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    ontology_loaded: ontology !== null,
    term_count: ontology ? ontology.terms.size : 0,
  });
});

loadOntology();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`HPO API (Node) listening on port ${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/docs`);
});
