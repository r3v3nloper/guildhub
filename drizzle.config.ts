import { defineConfig } from "drizzle-kit";
import { DEFAULT_DATABASE_PATH } from "./src/lib/env";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  },
});
