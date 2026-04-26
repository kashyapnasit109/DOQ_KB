// Pre-build script for Vercel API function
// Bundles api/index.ts + server/* into a single api/index.js file
import { build } from "esbuild";

async function buildApi() {
  console.log("Building API bundle for Vercel...");
  
  await build({
    entryPoints: ["api/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "api/index.mjs",
    target: "node18",
    minify: false,
    external: [
      // Keep native/large modules external — Vercel will resolve them from node_modules
      "@libsql/client",
      "express",
      "multer",
      "drizzle-orm",
      "drizzle-orm/libsql",
      "openai",
      "pdfjs-dist",
      "@napi-rs/canvas",
      "dotenv",
      "dotenv/config",
    ],
    logLevel: "info",
  });

  console.log("API bundle built successfully → api/index.mjs");
}

buildApi().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
