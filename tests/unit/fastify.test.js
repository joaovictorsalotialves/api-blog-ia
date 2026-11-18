import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fastify } from '../../src/fastify.js'

const app = fastify()
let server
let baseUrl

app.get('/health/:name', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ name: req.params.name }))
})

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
})

test('matches route parameters and decodes their values', async () => {
  const response = await fetch(`${baseUrl}/health/hello%20world`)

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { name: 'hello world' })
})

test('returns a JSON 404 for an unknown route', async () => {
  const response = await fetch(`${baseUrl}/unknown`)

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { message: 'Not Found' })
})
