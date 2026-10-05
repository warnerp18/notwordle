import { neon } from "@neondatabase/serverless";
import "server-only";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in your env.local file");
}

export const sql = neon(process.env.DATABASE_URL);
