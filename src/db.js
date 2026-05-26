import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('connect', () => {
  console.log('PostgreSQL connection established')
})

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error)
})

export async function connectDb() {
  try {
    await pool.query('SELECT 1')
    console.log('PostgreSQL connected successfully')
  } catch (error) {
    console.error('PostgreSQL connection failed:', error)
    throw error
  }
}

export async function query(text, params) {
  return pool.query(text, params)
}

export async function closeDb() {
  await pool.end()
}
