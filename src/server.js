import dns from "dns"
dns.setDefaultResultOrder("ipv4first")
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { apiRouter } from './routes/api.js'
import { connectDb, closeDb } from './db.js'
import { startIndexer } from './indexer.js'


const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (origin === process.env.CORS_ORIGIN) {
      return callback(null, true)
    }
    callback(null, false)
  }
}))

app.use(express.json())
app.use('/api', apiRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
})

try {
  await connectDb()
} catch (error) {
  console.error('Unable to start server due to database connection issue.')
  process.exit(1)
}

const stopIndexer = await startIndexer()

const server = app.listen(port, () => {
  console.log(`FFS indexer API listening on http://localhost:${port}`)
})

async function shutdown() {
  stopIndexer()
  server.close()
  await closeDb()
}

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0))
})

process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0))
})
