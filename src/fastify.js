import http from 'node:http'

function compilePath(path) {
  if (path === '/') {
    return { params: [], regex: /^\/$/ }
  }

  const params = []
  const expression = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        params.push(segment.slice(1))
        return '([^/]+)'
      }

      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')

  return { params, regex: new RegExp(`^${expression}/?$`) }
}

export function fastify() {
  const routes = []

  function registerRoute(method, path, handler) {
    if (!path.startsWith('/')) {
      throw new Error('Route paths must start with "/".')
    }

    const compiledPath = compilePath(path)
    routes.push({ method, path, handler, ...compiledPath })
    routes.sort((a, b) => {
      const aParams = a.params.length
      const bParams = b.params.length
      return aParams - bParams || b.path.length - a.path.length
    })
  }

  async function handleRequest(req, res) {
    let pathname

    try {
      pathname = new URL(req.url, 'http://localhost').pathname
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ message: 'Invalid request URL.' }))
    }

    const route = routes.find(
      (candidate) => candidate.method === req.method && candidate.regex.test(pathname),
    )

    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ message: 'Not Found' }))
    }

    const match = pathname.match(route.regex)

    try {
      req.params = Object.fromEntries(
        route.params.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
      )
      await route.handler(req, res)
    } catch (error) {
      if (res.writableEnded) return

      console.error(`Error handling ${req.method} ${pathname}:`, error)
      if (res.headersSent) return res.end()

      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ message: 'Internal Server Error' }))
    }
  }

  return {
    get(path, handler) {
      registerRoute('GET', path, handler)
    },
    post(path, handler) {
      registerRoute('POST', path, handler)
    },
    patch(path, handler) {
      registerRoute('PATCH', path, handler)
    },
    listen(port, host, callback) {
      const server = http.createServer(handleRequest)
      return server.listen(port, host, callback)
    },
  }
}
