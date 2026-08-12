import "dotenv/config";
import { Client } from "pg";
import { execSync } from "node:child_process";

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const { rows } = await client.query("select current_database() as db");
  console.log(`✓ Postgres connected (database: ${rows[0].db})`);
} catch (err) {
  console.error("✗ Could not connect to Postgres — check DATABASE_URL in .env");
  console.error(err.message);
  process.exit(1);
} finally {
  await client.end();
}

execSync("npx prisma migrate deploy", { stdio: "inherit" });
