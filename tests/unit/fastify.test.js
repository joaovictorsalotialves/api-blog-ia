import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fastify } from '../../src/fastify.js'
import { registerDocsRoutes } from '../../src/routes/docs.js'

const app = fastify()
registerDocsRoutes(app)
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

test('serves the Swagger UI at the requested documentation paths', async () => {
  for (const path of ['/ap/docs', '/api/docs']) {
    const response = await fetch(`${baseUrl}${path}`)

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/html/)
    assert.match(await response.text(), /swagger-ui-bundle/)
  }
})

test('serves the OpenAPI document as JSON', async () => {
  const response = await fetch(`${baseUrl}/api/docs/json`)
  const document = await response.json()

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /application\/json/)
  assert.equal(document.openapi, '3.1.0')
  assert.ok(document.paths['/posts/{id}/approve'])
  assert.ok(document.paths['/posts/draft'])
})
