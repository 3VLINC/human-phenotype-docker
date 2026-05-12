import fs from "node:fs";
import {
  getAncestors,
  getDescendants,
  parseObo,
  type OntologyData,
  type ParsedTerm,
  type TermSummary,
} from "./obo-parser";

export class OntologyFileNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`Ontology file not found: ${path}`);
    this.name = "OntologyFileNotFoundError";
  }
}

/** Read an OBO file from disk and parse it into structured ontology data. */
export function loadOntologyFromFile(path: string): OntologyData {
  if (!fs.existsSync(path)) {
    throw new OntologyFileNotFoundError(path);
  }
  const text = fs.readFileSync(path, "utf-8");
  return parseObo(text);
}

export interface OntologyMeta {
  name: string;
  data_version: string | null;
  term_count: number;
}

export function getOntologyMeta(o: OntologyData): OntologyMeta {
  return {
    name: "Human Phenotype Ontology",
    data_version: o.header.dataVersion ?? null,
    term_count: o.terms.size,
  };
}

export interface TermDetail {
  id: string;
  name: string | null;
  definition: string | null;
  comment: string | null;
  synonyms: ParsedTerm["synonyms"];
  xrefs: string[];
  is_obsolete: boolean;
  parents: TermSummary[];
  children: TermSummary[];
}

/** Term with one-hop parents and children, or `null` if the term id is unknown. */
export function getTerm(o: OntologyData, termId: string): TermDetail | null {
  const term = o.terms.get(termId);
  if (!term) return null;
  const parents = getAncestors(o.terms, o.parentMap, term.id, 1);
  const children = getDescendants(o.terms, o.childrenMap, term.id, 1);
  return {
    id: term.id,
    name: term.name,
    definition: term.definition,
    comment: term.comment,
    synonyms: term.synonyms,
    xrefs: term.xrefs,
    is_obsolete: term.isObsolete,
    parents,
    children,
  };
}

/** Ancestor summaries up to `distance` hops, or `null` if the term id is unknown. */
export function getTermParents(
  o: OntologyData,
  termId: string,
  distance: number
): TermSummary[] | null {
  const term = o.terms.get(termId);
  if (!term) return null;
  return getAncestors(o.terms, o.parentMap, term.id, distance);
}

/** Descendant summaries up to `distance` hops, or `null` if the term id is unknown. */
export function getTermChildren(
  o: OntologyData,
  termId: string,
  distance: number
): TermSummary[] | null {
  const term = o.terms.get(termId);
  if (!term) return null;
  return getDescendants(o.terms, o.childrenMap, term.id, distance);
}

export interface SearchResult {
  query: string;
  count: number;
  terms: TermSummary[];
}

/** Search non-obsolete terms by preferred name or synonym text (substring match). */
export function searchTerms(
  o: OntologyData,
  query: string,
  limit: number
): SearchResult {
  const queryLower = query.toLowerCase();
  const results: TermSummary[] = [];

  for (const term of o.terms.values()) {
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

  return { query, count: results.length, terms: results };
}

export interface HealthStatus {
  status: string;
  ontology_loaded: boolean;
  term_count: number;
}

export function getHealthStatus(o: OntologyData): HealthStatus {
  return {
    status: "ok",
    ontology_loaded: true,
    term_count: o.terms.size,
  };
}
