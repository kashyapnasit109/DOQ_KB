import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const httpServer = createServer(app);

// Initialize once (persisted across warm invocations)
let initPromise: Promise<void> | null = null;

function ensureInit() {
  if (!initPromise) {
    initPromise = registerRoutes(httpServer, app).then(() => {
      console.log("Routes registered successfully");
    }).catch((err) => {
      console.error("Failed to register routes:", err);
      initPromise = null; // Allow retry on next request
      throw err;
    });
  }
  return initPromise;
}

// Vercel serverless handler — must be default export
export default async function handler(req: any, res: any) {
  try {
    await ensureInit();
  } catch (err: any) {
    return res.status(500).json({
      error: "Server initialization failed",
      message: err.message,
    });
  }

  // Forward to Express
  return new Promise<void>((resolve) => {
    app(req, res);
    res.on("finish", resolve);
  });
}
