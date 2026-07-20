// drizzle.config.ts

import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
