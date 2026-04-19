import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const httpServer = createServer(app);
let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await registerRoutes(httpServer, app);
    initialized = true;
  }
}

// Vercel serverless handler
export default async function handler(req: any, res: any) {
  try {
    await ensureInit();
    return app(req, res);
  } catch (err: any) {
    console.error("Serverless function error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message || "Unknown error",
    });
  }
}
