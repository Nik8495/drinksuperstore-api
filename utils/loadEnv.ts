import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env['NODE_ENV'] || 'development';
const envFile = `.env.${env}`;

// Try finding .env file at multiple levels to handle both source and compiled paths
const candidates = [
  path.resolve(__dirname, '..', envFile),       // source: server/utils/../.env.X
  path.resolve(__dirname, '../..', envFile),     // compiled: server/dist/utils/../../.env.X
];

const envPath = candidates.find((p) => fs.existsSync(p));

if (envPath) {
  dotenv.config({ path: envPath });
} else {
  console.warn(`No ${envFile} found. Checked: ${candidates.join(', ')}`);
}
