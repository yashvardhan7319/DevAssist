import { config, validateConfig } from "./core/config/env";
import { logger } from "./core/utils/logger";
import compression from "compression";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./api/routes";
import { Database } from "./core/services/database";

// Validate configurations on boot
validateConfig();
Database.initialize();



function securityHeadersMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isDevelopment = config.nodeEnv !== "production";
  const scriptSrc = isDevelopment ? "'self' 'unsafe-eval' 'unsafe-inline'" : "'self'";
  const connectSrc = isDevelopment ? "'self' ws: http: https:" : "'self'";

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  next();
}

async function startServer() {
  const app = express();
  const PORT = config.port;

  app.disable("x-powered-by");

  // Request monitoring tracer
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info(`[API MONITOR] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    });
    next();
  });

  // Baseline browser security headers
  app.use(securityHeadersMiddleware);

  // Stream response compression without buffering whole responses in memory
  app.use(compression({ threshold: 1024 }));

  // Larger payloads are allowed only for repository code/files and analysis inputs.
  app.use("/api/repositories", express.json({ limit: config.largeJsonRequestLimit }));

  // Default API requests should stay small.
  app.use(express.json({ limit: config.jsonRequestLimit }));

  // Mount Unified API Router
  app.use("/api", apiRouter);

  // --- VITE DEV OR PRODUCTION STATIC SERVER ---
  if (config.nodeEnv !== "production") {
    logger.info("Starting development mode with Vite middleware...");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: PORT + 1 },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    logger.info("Starting production mode serving static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind and listen
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`DevAssist server running on http://0.0.0.0:${PORT}`);
  });
}

// Custom request types
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

startServer().catch((e) => {
  logger.error("Failed to start DevAssist server", e);
});
