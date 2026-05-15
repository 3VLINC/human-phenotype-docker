import {
  getHealthStatus,
  getOntologyMeta,
  getTerm,
  getTermChildren,
  getTermParents,
  searchTerms,
  type OntologyData,
} from "@threevl/hpo-lib";

export interface CreateHpoFetchHandlerOptions {
  ontology: OntologyData;
  /**
   * Pathname prefix to strip from the request URL before matching routes.
   * Example: `"/api"` when the app is mounted at `app.use("/api", …)` and
   * `new Request` uses `originalUrl` like `/api/ontology`.
   */
  basePath?: string;
  /**
   * When true, expose `GET …/health` (after basePath strip). Default true.
   */
  includeHealth?: boolean;
}

function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath) return "";
  let s = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

/**
 * Strip `basePath` from `pathname`. Returns `null` if the request is not under this mount.
 */
function stripBasePath(pathname: string, basePath: string): string | null {
  if (!basePath) {
    return pathname || "/";
  }
  if (pathname === basePath) {
    return "/";
  }
  if (pathname.startsWith(`${basePath}/`)) {
    const rest = pathname.slice(basePath.length);
    return rest || "/";
  }
  return null;
}

function clampDistance(value: unknown): number {
  return Math.min(Math.max(parseInt(String(value ?? "1"), 10) || 1, 1), 50);
}

function clampLimit(value: unknown): number {
  return Math.min(Math.max(parseInt(String(value ?? "20"), 10) || 20, 1), 100);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function empty(status: number): Response {
  return new Response(null, { status });
}

/**
 * Returns a Web Fetch handler: `Request` → `Promise<Response>`.
 *
 * Routes (after optional `basePath` strip): `GET /ontology`, `GET /terms/:termId`,
 * `GET /terms/:termId/parents`, `GET /terms/:termId/children`, `GET /search`, optional `GET /health`.
 */
export function createHpoFetchHandler(
  opts: CreateHpoFetchHandlerOptions,
): (request: Request) => Promise<Response> {
  const {
    ontology,
    basePath: rawBase = "",
    includeHealth = true,
  } = opts;
  const basePath = normalizeBasePath(rawBase);

  return async function handleHpoRequest(request: Request): Promise<Response> {
    const isHead = request.method === "HEAD";
    if (request.method !== "GET" && !isHead) {
      return json({ detail: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    const stripped = stripBasePath(url.pathname, basePath);
    if (stripped === null) {
      return empty(404);
    }
    const pathname = stripped;

    if (pathname === "/ontology") {
      return isHead ? empty(200) : json(getOntologyMeta(ontology));
    }

    const termDetail = /^\/terms\/([^/]+)$/.exec(pathname);
    if (termDetail) {
      const termId = decodeURIComponent(termDetail[1] ?? "");
      const detail = getTerm(ontology, termId);
      if (!detail) {
        return isHead ? empty(404) : json({ detail: `Term ${termId} not found` }, 404);
      }
      return isHead ? empty(200) : json(detail);
    }

    const termParents = /^\/terms\/([^/]+)\/parents$/.exec(pathname);
    if (termParents) {
      const termId = decodeURIComponent(termParents[1] ?? "");
      const distance = clampDistance(url.searchParams.get("distance"));
      const parents = getTermParents(ontology, termId, distance);
      if (!parents) {
        return isHead ? empty(404) : json({ detail: `Term ${termId} not found` }, 404);
      }
      return isHead ? empty(200) : json(parents);
    }

    const termChildren = /^\/terms\/([^/]+)\/children$/.exec(pathname);
    if (termChildren) {
      const termId = decodeURIComponent(termChildren[1] ?? "");
      const distance = clampDistance(url.searchParams.get("distance"));
      const children = getTermChildren(ontology, termId, distance);
      if (!children) {
        return isHead ? empty(404) : json({ detail: `Term ${termId} not found` }, 404);
      }
      return isHead ? empty(200) : json(children);
    }

    if (pathname === "/search") {
      const q = url.searchParams.get("q");
      if (q === null || q === "") {
        return isHead ? empty(400) : json({ detail: "Query parameter 'q' is required" }, 400);
      }
      const limit = clampLimit(url.searchParams.get("limit"));
      return isHead ? empty(200) : json(searchTerms(ontology, q, limit));
    }

    if (includeHealth && pathname === "/health") {
      return isHead ? empty(200) : json(getHealthStatus(ontology));
    }

    return empty(404);
  };
}
