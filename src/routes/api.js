import { Router } from 'express'
import { query } from '../db.js'

const apiRouter = Router()

apiRouter.get('/winners', async (_req, res, next) => {
  try {
    const result = await query(
      `
        select winner_address, amount_won, treasury_amount, transaction_hash, round_number, won_at
        from winners
        order by won_at desc
        limit 20
      `,
    )

    const winners = result.rows.map((row) => ({
      winner_address: row.winner_address,
      amount_won: Number(row.amount_won),
      treasury_amount: Number(row.treasury_amount),
      transaction_hash: row.transaction_hash,
      round_number: row.round_number,
      won_at: row.won_at,
    }))

    res.json(winners)
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/activity', async (_req, res, next) => {
  try {
    const result = await query(
      `
        select wallet_address as wallet_address,
               amount,
               transaction_hash,
               round_number,
               poured_at as timestamp,
               'pour' as type
        from pours
        union all
        select winner_address as wallet_address,
               amount_won as amount,
               transaction_hash,
               round_number,
               won_at as timestamp,
               'sip' as type
        from winners
        order by timestamp desc
        limit 50
      `,
    )

    const activity = result.rows.map((row) => ({
      type: row.type,
      wallet_address: row.wallet_address,
      amount: Number(row.amount),
      round_number: row.round_number,
      timestamp: row.timestamp,
      transaction_hash: row.transaction_hash,
    }))

    res.json(activity)
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/stats', async (_req, res, next) => {
  try {
    const [roundsResult, poursResult, winnersResult, participantsResult] = await Promise.all([
      query(
        `
          select count(*) as total_rounds
          from rounds
        `,
      ),
      query(
        `
          select count(*) as total_pours
          from pours
        `,
      ),
      query(
        `
          select coalesce(sum(amount_won), 0) as total_won, coalesce(sum(treasury_amount), 0) as total_treasury
          from winners
        `,
      ),
      query(
        `
          select count(distinct wallet_address) as total_participants
          from pours
        `,
      ),
    ])

    res.json({
      total_rounds: Number(roundsResult.rows[0]?.total_rounds ?? 0),
      total_ffs_distributed:
        Number(winnersResult.rows[0]?.total_won ?? 0) + Number(winnersResult.rows[0]?.total_treasury ?? 0),
      total_pours: Number(poursResult.rows[0]?.total_pours ?? 0),
      total_participants: Number(participantsResult.rows[0]?.total_participants ?? 0),
    })
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/round/current', async (_req, res, next) => {
  try {
    const result = await query(
      `
        select round_number, started_at, participants_count
        from rounds
        where ended_at is null
        order by round_number desc
        limit 1
      `,
    )

    if (result.rowCount === 0) {
      res.json({ round_number: null, started_at: null, participants_count: 0 })
      return
    }

    const round = result.rows[0]
    res.json({
      round_number: round.round_number,
      started_at: round.started_at,
      participants_count: round.participants_count ?? 0,
    })
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/holders', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(DISTINCT wallet_address) as holders FROM pours`
    )
    res.json({ holders: Number(result.rows[0]?.holders ?? 0) })
  } catch (error) {
    next(error)
  }
})


export { apiRouter }
