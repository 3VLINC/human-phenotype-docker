import express, {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import swaggerUi from "swagger-ui-express";
import {
  buildHpoOpenApiSpec,
  createHpoFetchHandler,
} from "@threevl/hpo-middleware";
import type { OntologyData } from "@threevl/hpo-lib";

export interface CreateHpoRouterOptions {
  ontology: OntologyData;
  /**
   * When true, mount Swagger UI on this router at `swaggerPath`.
   */
  mountSwagger?: boolean;
  /** Path segment for Swagger UI when `mountSwagger` is true. Default `/docs`. */
  swaggerPath?: string;
  /**
   * When true, expose `GET …/health` on this router (relative to Express mount).
   * Disable when the host app serves health elsewhere.
   */
  includeHealth?: boolean;
  /**
   * URL pathname where this router is mounted (`app.use(mountPath, router)`).
   * Must match the Express mount so the Fetch handler strips the correct prefix.
   * @default "/api"
   */
  mountPath?: string;
}

async function sendFetchResponseToExpress(
  res: ExpressResponse,
  fetchRes: globalThis.Response,
): Promise<void> {
  res.status(fetchRes.status);
  fetchRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await fetchRes.arrayBuffer());
  if (buf.length === 0 && fetchRes.status !== 204) {
    res.end();
    return;
  }
  res.send(buf.length ? buf : undefined);
}

/**
 * Express `Router` with HPO REST routes. Delegates to `@threevl/hpo-middleware` (Web Fetch).
 *
 * @example
 * ```ts
 * app.use("/api", createHpoRouter({ ontology }));
 * ```
 */
export function createHpoRouter(opts: CreateHpoRouterOptions): express.Router {
  const {
    mountSwagger = false,
    swaggerPath = "/docs",
    includeHealth = true,
    mountPath = "/api",
  } = opts;

  const fetchHandler = createHpoFetchHandler({
    ontology: opts.ontology,
    basePath: mountPath,
    includeHealth,
  });

  const router = express.Router();

  if (mountSwagger) {
    router.use(
      swaggerPath,
      swaggerUi.serve,
      swaggerUi.setup(buildHpoOpenApiSpec(mountPath)),
    );
  }

  router.use((req: ExpressRequest, res: ExpressResponse, next) => {
    void (async () => {
      try {
        const protocol = req.protocol || "http";
        const host = req.get("host") || "localhost";
        const url = new URL(req.originalUrl || req.url || "/", `${protocol}://${host}`);
        const webReq = new Request(url, {
          method: req.method,
          headers: req.headers as HeadersInit,
        });
        const webRes = await fetchHandler(webReq);
        await sendFetchResponseToExpress(res, webRes);
      } catch (err) {
        next(err);
      }
    })();
  });

  return router;
}
