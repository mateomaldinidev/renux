import { config } from 'dotenv'
import type { Config } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

export default {
  schema: "./app/server/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
