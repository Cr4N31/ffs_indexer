import { Router } from 'express'
import { query } from './db.js'
import { fromWeiString, rowToActivity, rowToWinner } from './format.js'

export const apiRouter = Router()

apiRouter.get('/winners', async (_req, res, next) => {
  try {
    const result = await query(
      `
        select *
        from bottle_events
        where event_name = 'BottleSipped'
        order by block_number desc, log_index desc
        limit 50
      `,
    )

    res.json({ winners: result.rows.map(rowToWinner) })
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/activity', async (_req, res, next) => {
  try {
    const result = await query(
      `
        select *
        from bottle_events
        order by block_number desc, log_index desc
        limit 50
      `,
    )

    res.json({ activity: result.rows.map(rowToActivity) })
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/stats', async (_req, res, next) => {
  try {
    const result = await query(
      `
        select
          count(*) filter (where event_name = 'Poured') as total_pours,
          count(*) filter (where event_name = 'BottleSipped') as total_sips,
          coalesce(sum(amount_wei) filter (where event_name = 'Poured'), 0) as total_poured_wei,
          coalesce(sum(winner_amount_wei), 0) as total_winner_paid_wei,
          coalesce(sum(treasury_amount_wei), 0) as total_treasury_paid_wei,
          max(round) as latest_round
        from bottle_events
      `,
    )

    const stats = result.rows[0]

    res.json({
      totalPours: Number(stats.total_pours),
      totalSips: Number(stats.total_sips),
      totalPoured: fromWeiString(stats.total_poured_wei),
      totalWinnerPaid: fromWeiString(stats.total_winner_paid_wei),
      totalTreasuryPaid: fromWeiString(stats.total_treasury_paid_wei),
      latestRound: stats.latest_round || '0',
    })
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/holders', async (_req, res, next) => {
  try {
    const response = await fetch(
      `https://api.cronoscan.com/api?module=token&action=tokenholderlist&contractaddress=${process.env.FFS_TOKEN_ADDRESS}&apikey=${process.env.CRONOSCAN_API_KEY}`
    )
    const data = await response.json()
    const count = Array.isArray(data.result) ? data.result.length : 0
    res.json({ holders: count })
  } catch (error) {
    next(error)
  }
})
