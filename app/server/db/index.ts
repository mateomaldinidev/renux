import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/renux";
const client = postgres(dbUrl, { max: 1 });
export const db = drizzle(client, { schema });
