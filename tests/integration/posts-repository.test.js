import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, test } from 'node:test'
import { pool } from '../../src/database/pool.js'
import {
  approvePost,
  findAllPosts,
  findAllPublishedAndApprovedPosts,
  findPostById,
  insertPost,
  rejectPost,
} from '../../src/repositories/posts-repository.js'

const postId = randomBytes(10).toString('hex')

before(async () => {
  await pool.query('SELECT 1')
})

after(async () => {
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [postId])
  } finally {
    await pool.end()
  }
})

test('persists, approves, publishes, and rejects a post', async () => {
  const draft = await insertPost({
    id: postId,
    title: 'Post de integração',
    content: 'Conteúdo do teste.',
    published_at: null,
    created_at: new Date().toISOString(),
    approved_at: null,
    rejected_at: null,
  })

  assert.equal(draft.id, postId)
  assert.equal(draft.title, 'Post de integração')
  assert.equal(draft.published_at, null)
  assert.equal(draft.created_at, new Date(draft.created_at).toISOString())
  assert.equal(
    (await findAllPosts()).some((post) => post.id === postId),
    true,
  )
  assert.equal(await findPostById(postId), null)
  assert.equal(
    (await findAllPublishedAndApprovedPosts()).some((post) => post.id === postId),
    false,
  )

  const approvedPost = await approvePost(postId)
  assert.equal(approvedPost.id, postId)
  assert.ok(approvedPost.approved_at)
  assert.ok(approvedPost.published_at)
  assert.equal((await findPostById(postId)).id, postId)
  assert.equal(
    (await findAllPublishedAndApprovedPosts()).some((post) => post.id === postId),
    true,
  )

  const rejectedPost = await rejectPost(postId)
  assert.ok(rejectedPost.rejected_at)
  assert.equal(rejectedPost.approved_at, null)
  assert.equal(rejectedPost.published_at, null)
  assert.equal(await findPostById(postId), null)
  assert.equal(
    (await findAllPublishedAndApprovedPosts()).some((post) => post.id === postId),
    false,
  )
})
