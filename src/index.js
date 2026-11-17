import { fastify } from './fastify.js'
import { registerPostRoutes } from './routes/posts.js'

const { API_PORT, API_HOST, API_PROTOCOL } = process.env
const app = fastify()

registerPostRoutes(app)

app.listen(API_PORT, API_HOST, () => {
  console.log(`Server running on ${API_PROTOCOL}://${API_HOST}:${API_PORT}`)
  console.log('Press CTRL+C to stop')
})
