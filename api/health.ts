// Diagnostic endpoint to test Turso connection
import { createClient } from "@libsql/client";

export default async function handler(req: any, res: any) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "SET (" + process.env.TURSO_DATABASE_URL.substring(0, 30) + "...)" : "NOT SET",
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "SET (length: " + process.env.TURSO_AUTH_TOKEN.length + ")" : "NOT SET",
      VERCEL: process.env.VERCEL || "NOT SET",
      NODE_ENV: process.env.NODE_ENV || "NOT SET",
    },
    dbTest: null as any,
    error: null as any,
  };

  try {
    const url = process.env.TURSO_DATABASE_URL || "file:/tmp/data.db";
    const config = process.env.TURSO_DATABASE_URL
      ? { url, authToken: process.env.TURSO_AUTH_TOKEN }
      : { url };

    diagnostics.dbConfig = { url: url.substring(0, 40) + "..." };

    const client = createClient(config as any);

    // Test basic connectivity
    const result = await client.execute("SELECT 1 as test");
    diagnostics.dbTest = { success: true, result: result.rows };

    // Try creating a table
    await client.execute(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'engineer',
      pin TEXT,
      created_at TEXT NOT NULL
    )`);
    diagnostics.dbTest.tableCreated = true;

    // Try reading from it
    const users = await client.execute("SELECT count(*) as cnt FROM users");
    diagnostics.dbTest.userCount = users.rows[0];

  } catch (err: any) {
    diagnostics.error = {
      message: err.message,
      name: err.name,
      stack: err.stack?.split("\n").slice(0, 5),
    };
  }

  res.status(200).json(diagnostics);
}
