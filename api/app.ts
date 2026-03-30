/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import requestRoutes from './routes/requests.js'
import metaRoutes from './routes/meta.js'
import { getSupabaseAdmin } from './lib/supabaseAdmin.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/meta', metaRoutes)

/**
 * health
 */
app.get('/api/health/db', async (req: Request, res: Response) => {
  void req
  const supabase = await getSupabaseAdmin()
  if (!supabase) {
    res.status(200).json({
      success: false,
      error: 'MissingEnv',
      data: {
        required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      },
    })
    return
  }

  try {
    const { error } = await supabase.from('service_requests').select('id').limit(1)
    if (error) {
      res.status(200).json({
        success: false,
        error: 'DbNotReady',
        data: {
          details: error.message,
        },
      })
      return
    }

    res.status(200).json({ success: true, message: 'db ok' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'UnknownError'
    res.status(500).json({ success: false, error: 'DbCrash', data: { message } })
  }
})

app.get(
  '/api/health',
  (req: Request, res: Response): void => {
    void req
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  void error
  void req
  void next
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
