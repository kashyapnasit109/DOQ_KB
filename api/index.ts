// @ts-nocheck
// Vercel Serverless Function Entry Point
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes.js";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const httpServer = createServer(app);

let initialized = false;
let initError: Error | null = null;

async function ensureInit() {
  if (initialized) return;
  if (initError) throw initError;

  try {
    await registerRoutes(httpServer, app);
    initialized = true;
    console.log("[api/index] Routes registered successfully");
  } catch (err: any) {
    initError = err;
    console.error("[api/index] Init failed:", err.message, err.stack);
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    await ensureInit();
  } catch (err: any) {
    console.error("[api/index] Handler init error:", err.message);
    return res.status(500).json({
      error: "Server initialization failed",
      detail: err.message,
    });
  }

  return new Promise<void>((resolve) => {
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

    try {
      app(req, res);
    } catch (err: any) {
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
      resolve();
    }
  });
}
