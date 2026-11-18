import { ZodError } from 'zod'
import { validateApiKey } from '../auth/validate-api-key.js'
import {
  approvePost,
  findAllPosts,
  findAllPublishedAndApprovedPosts,
  findPostById,
  rejectPost,
} from '../repositories/posts-repository.js'
import { createPostDraft } from '../services/create-post-draft.js'

export function registerPostRoutes(app) {
  app.get('/posts', async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const includeAll = url.searchParams.get('include') === 'all'

    if (includeAll) {
      if (!validateApiKey(req.headers.authorization)) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ message: 'Forbidden' }))
      }
    }

    let posts
    if (includeAll) {
      posts = await findAllPosts()
    } else {
      posts = await findAllPublishedAndApprovedPosts()
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ data: posts }))
  })

  app.get('/posts/:id', async (req, res) => {
    const post = await findPostById(req.params.id)

    if (!post) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ message: 'Post not found.' }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ data: post }))
  })

  app.patch('/posts/:id/approve', async (req, res) => {
    const post = await approvePost(req.params.id)

    if (!post) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ message: 'Post not found.' }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ data: post }))
  })

  app.delete('/posts/:id/reject', async (req, res) => {
    const post = await rejectPost(req.params.id)

    if (!post) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ message: 'Post not found.' }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ data: post }))
  })

  app.post('/posts/draft', async (req, res) => {
    try {
      const bodyBuffer = []
      for await (const chunk of req) bodyBuffer.push(chunk)

      const body = JSON.parse(Buffer.concat(bodyBuffer).toString())
      const post = await createPostDraft(body?.idea)

      res.writeHead(201, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ data: post }))
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        const message =
          error instanceof ZodError
            ? error.issues[0]?.message || 'Invalid input.'
            : 'Request body must be valid JSON.'
        res.writeHead(400, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ message }))
      }

      console.error('Error creating post draft:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ message: 'Unable to create post draft.' }))
    }
  })
}
