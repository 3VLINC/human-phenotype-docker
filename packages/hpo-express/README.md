# @threevl/hpo-express

Express router that exposes the Human Phenotype Ontology HTTP API using [@threevl/hpo-lib](https://www.npmjs.com/package/@threevl/hpo-lib).

## Install

```bash
npm install @threevl/hpo-express @threevl/hpo-lib express swagger-ui-express
```

## Usage

```ts
import express from "express";
import { loadOntologyFromFile } from "@threevl/hpo-lib";
import { createHpoRouter } from "@threevl/hpo-express";

const ontology = loadOntologyFromFile("/data/hp.obo");
const app = express();
app.use("/hpo", createHpoRouter({ ontology, mountSwagger: true }));
app.listen(3000);
```

With `mountSwagger: true`, Swagger UI is served at `{mountPath}{swaggerPath}` (default `/docs`), e.g. `/hpo/docs` when the router is mounted at `/hpo`.
