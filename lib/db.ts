import "server-only";
import { neon } from "@neondatabase/serverless";
import { schemaStatements } from "./schema.mjs";

let sql: ReturnType<typeof neon> | undefined;
let ready: Promise<void> | undefined;

async function init(run: (q: string) => Promise<unknown>) {
  for (const stmt of schemaStatements) await run(stmt);
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
    sql = neon(process.env.DATABASE_URL);
  }
  const s = sql;
  ready ??= init((q) => s.query(q)).catch((e) => {
    ready = undefined;
    throw e;
  });
  await ready;
  return (await s.query(text, params)) as T[];
}
