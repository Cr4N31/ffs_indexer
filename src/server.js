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

// ← FIXED: added Vercel URL to allowed origins
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://forfoxsakecro.de',
      'https://for-fox-sake.vercel.app',
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`))
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

const server = app.listen(port, () => {
  console.log(`FFS indexer API listening on http://localhost:${port}`)
})

let stopIndexer = null

async function initializeIndexer() {
  try {
    stopIndexer = await startIndexer()
  } catch (error) {
    console.error('Indexer failed to start:', error)
  }
}

initializeIndexer()

async function shutdown() {
  if (stopIndexer) stopIndexer()
  server.close(() => {
    console.log('Server closed')
  })
  await closeDb()
}

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0))
})

process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0))
})