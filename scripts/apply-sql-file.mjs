/**
 * Aplica um arquivo SQL via DATABASE_URL do server/.env
 * Uso: node scripts/apply-sql-file.mjs supabase/migrations/arquivo.sql
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const require = createRequire(join(root, 'server', 'package.json'))
const { Client } = require('pg')

function loadEnv(path) {
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnv(join(root, 'server', '.env'))

const file = process.argv[2]
if (!file) {
  console.error('Informe o arquivo SQL')
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL ausente em server/.env')
  process.exit(1)
}

const sql = readFileSync(resolve(root, file), 'utf8')
const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
try {
  console.log(`Aplicando ${file} (${sql.length} chars)...`)
  await client.query(sql)
  console.log('OK')
} catch (err) {
  console.error('FALHA:', err.message)
  if (err.detail) console.error(err.detail)
  if (err.hint) console.error(err.hint)
  process.exitCode = 1
} finally {
  await client.end()
}

void pathToFileURL
