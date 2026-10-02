import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

export default function globalSetup() {
  const root = path.resolve(__dirname, "../..");
  const databasePath = path.join(root, "prisma/e2e.db");
  const migrationsPath = path.join(root, "prisma/migrations");

  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-journal`, { force: true });

  for (const migration of readdirSync(migrationsPath).sort()) {
    const sqlPath = path.join(migrationsPath, migration, "migration.sql");
    if (!existsSync(sqlPath)) continue;
    const sql = readFileSync(sqlPath, "utf8");
    execFileSync("sqlite3", [databasePath], { input: sql });
  }

  execFileSync("bun", ["run", "prisma/seed.ts"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "file:./e2e.db" },
    stdio: "inherit",
  });
}
