import express, { type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";
import {
  getHealthStatus,
  getOntologyMeta,
  getTerm,
  getTermChildren,
  getTermParents,
  searchTerms,
  type OntologyData,
} from "@threevl/hpo-lib";
import { hpoOpenApiSpec } from "./openapi";

export interface CreateHpoRouterOptions {
  ontology: OntologyData;
  /**
   * When true, mount Swagger UI on this router at `swaggerPath`.
   * For a root `/docs` URL, mount this router at `/` or mount Swagger on the app separately.
   */
  mountSwagger?: boolean;
  /** Path segment for Swagger UI when `mountSwagger` is true. Default `/docs`. */
  swaggerPath?: string;
  /**
   * When true, expose `GET /health` on this router.
   * Disable when the host app serves health at a fixed path (e.g. `/health` at app root).
   */
  includeHealth?: boolean;
}

function clampDistance(value: unknown): number {
  return Math.min(Math.max(parseInt(String(value ?? "1"), 10) || 1, 1), 50);
}

function clampLimit(value: unknown): number {
  return Math.min(Math.max(parseInt(String(value ?? "20"), 10) || 20, 1), 100);
}

/**
 * Express `Router` with HPO REST routes relative to its mount point:
 * `GET /ontology`, `GET /terms/:termId`, `GET /terms/:termId/parents`, `GET /terms/:termId/children`, `GET /search`,
 * and optionally `GET /health` and Swagger UI.
 *
 * @example
 * ```ts
 * app.use("/api", createHpoRouter({ ontology }));
 * ```
 */
export function createHpoRouter(opts: CreateHpoRouterOptions): express.Router {
  const {
    ontology,
    mountSwagger = false,
    swaggerPath = "/docs",
    includeHealth = true,
  } = opts;

  const router = express.Router();

  if (mountSwagger) {
    router.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(hpoOpenApiSpec));
  }

  router.get("/ontology", (_req: Request, res: Response) => {
    res.json(getOntologyMeta(ontology));
  });

  router.get("/terms/:termId", (req: Request, res: Response) => {
    const termId = req.params.termId ?? "";
    const detail = getTerm(ontology, termId);
    if (!detail) {
      return res.status(404).json({ detail: `Term ${termId} not found` });
    }
    res.json(detail);
  });

  router.get("/terms/:termId/parents", (req: Request, res: Response) => {
    const termId = req.params.termId ?? "";
    const distance = clampDistance(req.query.distance);
    const parents = getTermParents(ontology, termId, distance);
    if (!parents) {
      return res.status(404).json({ detail: `Term ${termId} not found` });
    }
    res.json(parents);
  });

  router.get("/terms/:termId/children", (req: Request, res: Response) => {
    const termId = req.params.termId ?? "";
    const distance = clampDistance(req.query.distance);
    const children = getTermChildren(ontology, termId, distance);
    if (!children) {
      return res.status(404).json({ detail: `Term ${termId} not found` });
    }
    res.json(children);
  });

  router.get("/search", (req: Request, res: Response) => {
    const q = req.query.q;
    if (q === undefined || q === "") {
      return res.status(400).json({ detail: "Query parameter 'q' is required" });
    }

    const qStr = Array.isArray(q) ? q[0] : q;
    if (typeof qStr !== "string" || qStr.length === 0) {
      return res.status(400).json({ detail: "Query parameter 'q' is required" });
    }

    const limit = clampLimit(req.query.limit);
    res.json(searchTerms(ontology, qStr, limit));
  });

  if (includeHealth) {
    router.get("/health", (_req: Request, res: Response) => {
      res.json(getHealthStatus(ontology));
    });
  }

  return router;
}
