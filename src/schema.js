import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { closeDb, query } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(__dirname, '..', 'schema.sql')

await query(await readFile(schemaPath, 'utf8'))
await closeDb()

console.log('Database schema is ready.')
