import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { pool } from '../../src/database/pool.js'
import { insertPost } from '../../src/repositories/posts-repository.js'

const postId = randomBytes(10).toString('hex')
const apiKey = 'test-api-key'
const app = createApp()
let server
let originalApiKey

before(async () => {
  await pool.query('SELECT 1')
  await insertPost({
    id: postId,
    title: 'Post E2E',
    content: 'Conteúdo para validar a API.',
    published_at: null,
    created_at: new Date().toISOString(),
    approved_at: null,
    rejected_at: null,
  })

  originalApiKey = process.env.API_KEY
  process.env.API_KEY = apiKey
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
})

after(async () => {
  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [postId])
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.API_KEY
    } else {
      process.env.API_KEY = originalApiKey
    }
    await pool.end()
  }
})

test('serves the post workflow over HTTP', async () => {
  const api = request(server)

  const forbiddenList = await api.get('/posts?include=all')
  assert.equal(forbiddenList.status, 403)
  assert.deepEqual(forbiddenList.body, { message: 'Forbidden' })

  const allPosts = await api.get('/posts?include=all').set('Authorization', `Bearer ${apiKey}`)
  assert.equal(allPosts.status, 200)
  assert.equal(
    allPosts.body.data.some((post) => post.id === postId),
    true,
  )

  const missingPost = await api.get(`/posts/${postId}`)
  assert.equal(missingPost.status, 404)

  const approvedPost = await api.patch(`/posts/${postId}/approve`)
  assert.equal(approvedPost.status, 200)
  assert.equal(approvedPost.body.data.id, postId)
  assert.ok(approvedPost.body.data.approved_at)

  const publicPost = await api.get(`/posts/${postId}`)
  assert.equal(publicPost.status, 200)
  assert.equal(publicPost.body.data.title, 'Post E2E')

  const rejectedPost = await api.delete(`/posts/${postId}/reject`)
  assert.equal(rejectedPost.status, 200)
  assert.ok(rejectedPost.body.data.rejected_at)
  assert.equal((await api.get(`/posts/${postId}`)).status, 404)

  const invalidIdea = await api.post('/posts/draft').send({ idea: '   ' })
  assert.equal(invalidIdea.status, 400)

  const notFound = await api.get('/missing-route')
  assert.equal(notFound.status, 404)
})
