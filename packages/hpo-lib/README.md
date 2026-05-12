# @threevl/hpo-lib

Server-agnostic library for loading Human Phenotype Ontology (HPO) `.obo` files and resolving term metadata, graph neighbourhood, and text search.

## Usage

```ts
import {
  loadOntologyFromFile,
  getTerm,
  searchTerms,
} from "@threevl/hpo-lib";

const ontology = loadOntologyFromFile("/path/to/hp.obo");
const term = getTerm(ontology, "HP:0000001");
const hits = searchTerms(ontology, "seizure", 20);
```

## API

See exported functions and types in `src/index.ts`.
