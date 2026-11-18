import { fastify } from './fastify.js'
import { registerDocsRoutes } from './routes/docs.js'
import { registerPostRoutes } from './routes/posts.js'

export function createApp() {
  const app = fastify()
  registerDocsRoutes(app)
  registerPostRoutes(app)
  return app
}
