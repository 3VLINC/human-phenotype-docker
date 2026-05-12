export interface TermSynonym {
  text: string;
  scope: string;
}

/** Internal term shape including parent IDs before graph is built */
export interface ParsedTerm {
  id: string;
  name: string | null;
  definition: string | null;
  comment: string | null;
  synonyms: TermSynonym[];
  xrefs: string[];
  isObsolete: boolean;
  _parentIds: string[];
}

export interface OntologyHeader {
  dataVersion?: string;
  ontology?: string;
}

export interface OntologyData {
  header: OntologyHeader;
  terms: Map<string, ParsedTerm>;
  childrenMap: Map<string, string[]>;
  parentMap: Map<string, string[]>;
}

export interface TermSummary {
  id: string;
  name: string | null;
}

export function parseObo(text: string): OntologyData {
  const header: OntologyHeader = {};
  const terms = new Map<string, ParsedTerm>();
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();

  const blocks = text.split(/\n(?=\[)/);
  const headerBlock = blocks[0] ?? "";

  for (const line of headerBlock.split("\n")) {
    const match = line.match(/^([\w-]+):\s*(.+)/);
    if (match) {
      const [, key, value] = match;
      if (key === "data-version") header.dataVersion = value.trim();
      if (key === "ontology") header.ontology = value.trim();
    }
  }

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block?.startsWith("[Term]")) continue;

    const term = parseTerm(block);
    if (!term) continue;

    terms.set(term.id, term);

    if (!childrenMap.has(term.id)) childrenMap.set(term.id, []);
    if (!parentMap.has(term.id)) parentMap.set(term.id, []);

    for (const parentId of term._parentIds) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(term.id);

      parentMap.get(term.id)!.push(parentId);
    }
  }

  return { header, terms, childrenMap, parentMap };
}

function parseTerm(block: string): ParsedTerm | null {
  const lines = block.split("\n");
  let id: string | null = null;
  let name: string | null = null;
  let definition: string | null = null;
  let comment: string | null = null;
  const synonyms: TermSynonym[] = [];
  const xrefs: string[] = [];
  const parentIds: string[] = [];
  let isObsolete = false;

  for (const line of lines) {
    if (line.startsWith("id: ")) {
      id = line.slice(4).trim();
    } else if (line.startsWith("name: ")) {
      name = line.slice(6).trim();
    } else if (line.startsWith("def: ")) {
      const defMatch = line.match(/^def:\s*"((?:[^"\\]|\\.)*)"/);
      if (defMatch) definition = defMatch[1].replace(/\\"/g, '"');
    } else if (line.startsWith("comment: ")) {
      comment = line.slice(9).trim();
    } else if (line.startsWith("synonym: ")) {
      const synMatch = line.match(
        /^synonym:\s*"((?:[^"\\]|\\.)*)"\s+(EXACT|BROAD|NARROW|RELATED)/
      );
      if (synMatch) {
        synonyms.push({
          text: synMatch[1].replace(/\\"/g, '"'),
          scope: synMatch[2],
        });
      }
    } else if (line.startsWith("xref: ")) {
      xrefs.push(line.slice(6).trim());
    } else if (line.startsWith("is_a: ")) {
      const isaMatch = line.match(/^is_a:\s*(\S+)/);
      if (isaMatch) parentIds.push(isaMatch[1]);
    } else if (line.startsWith("is_obsolete: true")) {
      isObsolete = true;
    }
  }

  if (!id) return null;

  return {
    id,
    name,
    definition,
    comment,
    synonyms,
    xrefs,
    isObsolete,
    _parentIds: parentIds,
  };
}

export function getAncestors(
  terms: Map<string, ParsedTerm>,
  parentMap: Map<string, string[]>,
  termId: string,
  distance: number
): TermSummary[] {
  const result: TermSummary[] = [];
  const visited = new Set<string>([termId]);
  let frontier: string[] = [termId];

  for (let d = 0; d < distance && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const current of frontier) {
      const parents = parentMap.get(current) ?? [];
      for (const pid of parents) {
        if (!visited.has(pid)) {
          visited.add(pid);
          const t = terms.get(pid);
          if (t) result.push({ id: t.id, name: t.name });
          next.push(pid);
        }
      }
    }
    frontier = next;
  }

  return result;
}

export function getDescendants(
  terms: Map<string, ParsedTerm>,
  childrenMap: Map<string, string[]>,
  termId: string,
  distance: number
): TermSummary[] {
  const result: TermSummary[] = [];
  const visited = new Set<string>([termId]);
  let frontier: string[] = [termId];

  for (let d = 0; d < distance && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const current of frontier) {
      const children = childrenMap.get(current) ?? [];
      for (const cid of children) {
        if (!visited.has(cid)) {
          visited.add(cid);
          const t = terms.get(cid);
          if (t) result.push({ id: t.id, name: t.name });
          next.push(cid);
        }
      }
    }
    frontier = next;
  }

  return result;
}
