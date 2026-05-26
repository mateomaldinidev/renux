import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/renux";
const pool = new Pool({ connectionString: dbUrl });
export const db = drizzle(pool, { schema });
