import express from "express";
import { createServer } from "http";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

let initialized = false;
let initError: Error | null = null;

async function ensureInit() {
  if (initialized) return;
  if (initError) throw initError;

  try {
    // Dynamic import to avoid bundling issues
    const { registerRoutes } = await import("../server/routes");
    const httpServer = createServer(app);
    await registerRoutes(httpServer, app);
    initialized = true;
    console.log("[api/index] Routes registered successfully");
  } catch (err: any) {
    initError = err;
    console.error("[api/index] Init failed:", err.message, err.stack);
    throw err;
  }
}

// Vercel serverless handler
export default async function handler(req: any, res: any) {
  try {
    await ensureInit();
  } catch (err: any) {
    console.error("[api/index] Handler init error:", err.message);
    return res.status(500).json({
      error: "Server initialization failed",
      detail: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    });
  }

  // Wrap Express handling in a promise
  return new Promise<void>((resolve, reject) => {
    // Set a timeout in case Express never responds
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: "Request timeout" });
      }
      resolve();
    }, 55000);

    res.on("finish", () => {
      clearTimeout(timeout);
      resolve();
    });

    res.on("error", (err: any) => {
      clearTimeout(timeout);
      reject(err);
    });

    try {
      app(req, res);
    } catch (err: any) {
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.status(500).json({ error: "Express handler error", detail: err.message });
      }
      resolve();
    }
  });
}
