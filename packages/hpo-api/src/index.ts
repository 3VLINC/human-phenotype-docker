#!/usr/bin/env node
import express from "express";
import swaggerUi from "swagger-ui-express";
import { createHpoRouter, hpoOpenApiSpec } from "@threevl/hpo-express";
import {
  getHealthStatus,
  loadOntologyFromFile,
  OntologyFileNotFoundError,
} from "@threevl/hpo-lib";

const HPO_OBO_PATH = process.env.HPO_OBO_PATH ?? "/data/hp.obo";
const PORT = parseInt(process.env.PORT ?? "8000", 10);

function main(): void {
  console.log(`Loading ontology from ${HPO_OBO_PATH}...`);
  const start = Date.now();
  let ontology;
  try {
    ontology = loadOntologyFromFile(HPO_OBO_PATH);
  } catch (e: unknown) {
    if (e instanceof OntologyFileNotFoundError) {
      console.error(e.message);
      console.error("Mount your .obo file into the container at /data/hp.obo");
      process.exit(1);
    }
    throw e;
  }
  const elapsed = Date.now() - start;
  console.log(
    `Loaded ${ontology.terms.size} terms in ${(elapsed / 1000).toFixed(1)}s`
  );

  const app = express();

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(hpoOpenApiSpec));
  app.use(
    "/api",
    createHpoRouter({
      ontology,
      mountSwagger: false,
      includeHealth: false,
    })
  );
  app.get("/health", (_req, res) => {
    res.json(getHealthStatus(ontology));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HPO API (Node) listening on port ${PORT}`);
    console.log(`Swagger UI at http://localhost:${PORT}/docs`);
  });
}

main();
