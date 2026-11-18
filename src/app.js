import { fastify } from './fastify.js'
import { registerPostRoutes } from './routes/posts.js'

export function createApp() {
  const app = fastify()
  registerPostRoutes(app)
  return app
}
