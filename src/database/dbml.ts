// Generates docs/schema.dbml from the Drizzle schema. Run with: pnpm db:dbml

import { pgGenerate } from 'drizzle-dbml-generator';
import * as schema from './schema';

pgGenerate({ schema, out: './docs/schema.dbml' });
