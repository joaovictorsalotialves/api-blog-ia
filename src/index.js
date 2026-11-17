import http from 'node:http'
import { ZodError } from 'zod'
import { findAllPosts } from './repositories/posts-repository.js'
import { createPostDraft } from './services/create-post-draft.js'

const { API_PORT, API_HOST, API_PROTOCOL } = process.env

const server = http.createServer(async (req, res) => {
  const { url, method } = req
  const paths = url.split('?').filter(Boolean)
  const path = paths.at(0) || '/'

  if (path === '/posts' && method === 'GET') {
    const posts = await findAllPosts()

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ data: posts }))
  }

  if (path === '/posts/draft' && method === 'POST') {
    const bodyBuffer = []
    let body = null

    // Armazena o corpo da requisição em um array
    req.on('data', (chunk) => bodyBuffer.push(chunk))
    req.on('end', async () => {
      try {
        const bodyString = Buffer.concat(bodyBuffer).toString()
        body = JSON.parse(bodyString)

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

    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({ message: 'Not Found' }))
})

server.listen(API_PORT, API_HOST, () => {
  console.log(`Server running on ${API_PROTOCOL}://${API_HOST}:${API_PORT}`)
  console.log('Press CTRL+C to stop')
})
