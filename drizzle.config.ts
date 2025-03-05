import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error('Missing SUPABASE_DB_URL environment variable')
}

// Parse and encode the connection string
const connectionString = process.env.SUPABASE_DB_URL
const regex = /postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/
const matches = connectionString.match(regex)
let encodedUrl = connectionString

if (matches) {
  const [_, user, pass, host, dbname] = matches
  encodedUrl = `postgresql://${user}:${encodeURIComponent(pass)}@${host}/${dbname}`
}

export default defineConfig({
  schema: "./schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: encodedUrl,
  },
});
