const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Blog IA API',
    version: '1.0.0',
    description:
      'API REST para gerar rascunhos de posts com IA e gerenciar publicação e aprovação.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Posts', description: 'Operações para gerenciar posts.' }],
  paths: {
    '/posts': {
      get: {
        tags: ['Posts'],
        summary: 'Lista posts',
        description:
          'Por padrão, lista posts publicados e aprovados. Use `include=all` para listar todos os posts; nesse caso, envie a API key como Bearer token.',
        parameters: [
          {
            name: 'include',
            in: 'query',
            required: false,
            description: 'Use `all` para incluir todos os posts.',
            schema: { type: 'string', enum: ['all'] },
          },
        ],
        security: [{ BearerAuth: [] }, {}],
        responses: {
          200: {
            description: 'Lista de posts.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
                  },
                },
              },
            },
          },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/posts/{id}': {
      get: {
        tags: ['Posts'],
        summary: 'Busca um post pelo ID',
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        responses: {
          200: { $ref: '#/components/responses/PostFound' },
          404: { $ref: '#/components/responses/PostNotFound' },
        },
      },
    },
    '/posts/draft': {
      post: {
        tags: ['Posts'],
        summary: 'Gera um rascunho de post',
        description:
          'Gera e salva um rascunho a partir de uma ideia. Requer OPENAI_API_KEY configurada.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idea'],
                properties: {
                  idea: { type: 'string', minLength: 1, description: 'Ideia do post.' },
                },
              },
              example: { idea: 'Como começar a programar em Node.js' },
            },
          },
        },
        responses: {
          201: { $ref: '#/components/responses/PostFound' },
          400: {
            description: 'JSON inválido ou ideia ausente/em branco.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          500: {
            description: 'Falha ao gerar o rascunho.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/posts/{id}/approve': {
      patch: {
        tags: ['Posts'],
        summary: 'Aprova e publica um post',
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        responses: {
          200: { $ref: '#/components/responses/PostFound' },
          404: { $ref: '#/components/responses/PostNotFound' },
        },
      },
    },
    '/posts/{id}/reject': {
      delete: {
        tags: ['Posts'],
        summary: 'Rejeita um post',
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        responses: {
          200: { $ref: '#/components/responses/PostFound' },
          404: { $ref: '#/components/responses/PostNotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API_KEY',
        description: 'Informe a API key configurada em API_KEY.',
      },
    },
    parameters: {
      PostId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identificador do post.',
        schema: { type: 'string' },
      },
    },
    schemas: {
      Post: {
        type: 'object',
        required: [
          'id',
          'title',
          'content',
          'published_at',
          'created_at',
          'approved_at',
          'rejected_at',
        ],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string', description: 'Conteúdo em Markdown.' },
          published_at: { type: ['string', 'null'], format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          approved_at: { type: ['string', 'null'], format: 'date-time' },
          rejected_at: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string' } },
      },
    },
    responses: {
      PostFound: {
        description: 'Post encontrado ou atualizado.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['data'],
              properties: { data: { $ref: '#/components/schemas/Post' } },
            },
          },
        },
      },
      PostNotFound: {
        description: 'Post não encontrado ou não visível publicamente.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'API key ausente, inválida ou não configurada.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
}

const swaggerUiHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog IA API — Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({ url: '/api/docs/json', dom_id: '#swagger-ui' })
    </script>
  </body>
</html>`

export function registerDocsRoutes(app) {
  app.get('/api/docs/json', (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify(openApiDocument))
  })

  for (const path of ['/ap/docs', '/api/docs']) {
    app.get(path, (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(swaggerUiHtml)
    })
  }
}
