import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import entries from './routes/entries'

const app = new Hono()

app.use(cors())

// Health check
app.get('/', (c) => {
  return c.json({ message: 'Yournal API is running' })
})

// Mount routes
app.route('/auth', auth)
app.route('/entries', entries)

export default app
