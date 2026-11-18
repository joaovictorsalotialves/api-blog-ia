# Blog IA — API

API REST em Node.js para gerar rascunhos de posts com IA e gerenciar sua aprovação e publicação. Os posts são persistidos em PostgreSQL.

## Tecnologias

- Node.js 24 (versão indicada em `.nvmrc`)
- PostgreSQL 17
- Mastra e OpenAI (`gpt-4o-mini`) para geração de conteúdo
- Docker para empacotamento da API

## Estrutura do projeto

```text
src/
├── auth/                 # Validação da API key
├── database/             # Pool PostgreSQL e migrations
├── mastra/               # Agente de escrita com IA
├── repositories/         # Consultas e persistência de posts
├── routes/               # Endpoints HTTP
├── services/             # Criação de rascunhos
├── fastify.js            # Wrapper HTTP baseado em node:http
└── index.js              # Inicialização da API
```

## Requisitos

Para desenvolvimento local:

- Node.js 24 e npm
- Docker Desktop com Docker Compose, para executar PostgreSQL localmente
- Uma chave da API OpenAI para gerar rascunhos

Para build/publicação da imagem:

- Docker
- Acesso a um registry de imagens, por exemplo Docker Hub, GitHub Container Registry ou Azure Container Registry

## Configuração

Copie o modelo de ambiente para um arquivo local. No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configure os valores em `.env.local`:

| Variável | Obrigatória | Descrição | Valor local sugerido |
| --- | --- | --- | --- |
| `API_HOST` | Sim | Interface de rede onde a API escuta. Em container, deve ser `0.0.0.0`. | `localhost` para execução local; `0.0.0.0` no container |
| `API_PORT` | Sim | Porta interna da API. | `8080` |
| `API_PROTOCOL` | Não | Usada apenas na mensagem de inicialização; TLS deve ser terminado por proxy/load balancer. | `http` |
| `DATABASE_URL` | Sim | URL de conexão PostgreSQL. | `postgresql://postgres:postgres@localhost:5433/blog` |
| `OPENAI_API_KEY` | Para gerar rascunhos | Chave OpenAI utilizada pelo agente de escrita. | Fornecida pela OpenAI |
| `API_KEY` | Para `include=all` | Chave compartilhada que autoriza a listagem de todos os posts. | Gere uma chave aleatória forte |

Não commite `.env.local` nem outros arquivos com segredos. Em produção, configure os segredos no serviço de hospedagem/secret manager, não no Dockerfile ou na imagem. Gere uma chave aleatória para `API_KEY`, por exemplo com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

## Executar localmente

1. Instale as dependências:

   ```powershell
   npm ci
   ```

2. Configure `.env.local` conforme a tabela. O banco definido pelo Compose publica a porta `5433` no host.
3. Inicie o PostgreSQL:

   ```powershell
   npm run infra:up
   ```

4. Aplique as migrations:

   ```powershell
   npm run migrate:up
   ```

5. Inicie a API em modo de desenvolvimento:

   ```powershell
   npm run dev
   ```

A API fica em `http://localhost:8080` com a configuração sugerida. O Compose atual inicia somente o PostgreSQL; a API é executada pelo Node no host.

## Testes

Os testes usam o runner nativo `node:test`. As suítes de integração e E2E dependem do PostgreSQL local com as migrations aplicadas; configure `.env.local`, suba a infraestrutura e rode `npm run migrate:up` antes delas. Os testes usam IDs aleatórios e removem os registros criados ao final.

```powershell
npm run test:unit
npm run test:integration
npm run test:e2e
npm test
```

`test:unit` não exige banco. `test:integration` verifica o repositório diretamente no PostgreSQL. `test:e2e` inicia a aplicação em uma porta local aleatória e usa Supertest para validar as rotas HTTP junto com o banco, sem chamar o provedor de IA.

Para parar o banco:

```powershell
npm run infra:down
```

O volume `postgres_data` é preservado. Não use `docker compose down -v` a menos que queira apagar permanentemente os dados locais.

### Subir o PostgreSQL manualmente, sem Compose

Alternativamente, crie um volume e inicie o container do banco diretamente:

```powershell
docker volume create blogia-postgres-data
docker run -d --name rocketseat-blog-postgres --restart unless-stopped -p 5433:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blog -v blogia-postgres-data:/var/lib/postgresql/data postgres:17-alpine
```

Aguarde a prontidão:

```powershell
docker exec rocketseat-blog-postgres pg_isready -U postgres -d blog
```

Use a mesma `DATABASE_URL` local indicada acima para executar as migrations pelo host. As variáveis de inicialização do PostgreSQL só são aplicadas quando o volume é criado pela primeira vez; trocar a senha no comando não altera a senha de um banco já inicializado.

## Endpoints

Todas as respostas usam JSON. Os exemplos abaixo usam `curl.exe`, disponível no Windows moderno, e assumem que a API está em `http://localhost:8080`.

### `GET /posts`

Lista posts publicados, aprovados, não rejeitados e cuja data de publicação já chegou. Não exige autenticação.

```powershell
curl.exe http://localhost:8080/posts
```

Resposta `200`:

```json
{
  "data": [
    {
      "id": "id-do-post",
      "title": "Título",
      "content": "Conteúdo em Markdown",
      "published_at": "2026-01-01T12:00:00.000Z",
      "created_at": "2026-01-01T11:00:00.000Z",
      "approved_at": "2026-01-01T11:30:00.000Z",
      "rejected_at": null
    }
  ]
}
```

#### `GET /posts?include=all`

Lista todos os posts, inclusive rascunhos, rejeitados e agendados. Exige `Authorization: Bearer <API_KEY>`. Chave ausente, inválida ou não configurada retorna `403 Forbidden`.

```powershell
curl.exe -H "Authorization: Bearer SUA_API_KEY" "http://localhost:8080/posts?include=all"
```

### `GET /posts/:id`

Busca um post pelo ID. Retorna `200` com `{ "data": post }` se o post for visível na listagem pública; caso contrário, `404` com `{ "message": "Post not found." }`.

```powershell
curl.exe http://localhost:8080/posts/id-do-post
```

### `POST /posts/draft`

Gera e salva um rascunho com base na ideia enviada. Requer `OPENAI_API_KEY` configurada.

```powershell
curl.exe -X POST http://localhost:8080/posts/draft -H "Content-Type: application/json" -d '{"idea":"Como começar a programar em Node.js"}'
```

Sucesso retorna `201` com `{ "data": post }`. JSON inválido ou `idea` ausente/em branco retorna `400`; falha na geração retorna `500`.

### `PATCH /posts/:id/approve`

Aprova e publica imediatamente o post, definindo `approved_at` e `published_at` para o horário atual e removendo eventual rejeição. Retorna `200` com o post atualizado ou `404` quando o ID não existe.

```powershell
curl.exe -X PATCH http://localhost:8080/posts/id-do-post/approve
```

### `DELETE /posts/:id/reject`

Rejeita o post, definindo `rejected_at` e limpando `approved_at` e `published_at`. Retorna `200` com o post atualizado ou `404` quando o ID não existe.

```powershell
curl.exe -X DELETE http://localhost:8080/posts/id-do-post/reject
```

> **Importante:** atualmente os endpoints de aprovação e rejeição não exigem autenticação. Não exponha a API publicamente em produção antes de proteger essas operações com autorização apropriada.

## Banco de dados e migrations

A migration `001.do.create-posts-table.sql` cria a tabela `posts`. O comando local `npm run migrate:up` usa `DATABASE_URL` de `.env.local`. Para produção, aplique as migrations uma vez por release, a partir de um ambiente confiável com acesso ao PostgreSQL de produção e `DATABASE_URL` fornecida como variável segura. A dependência `postgrator-cli` é de desenvolvimento e não está incluída na imagem de runtime.

A migration de rollback `001.undo.create-posts-table.sql` remove a tabela `posts` e seus dados; não execute rollback em produção sem um plano de backup e recuperação.

Para aplicar migrations de produção a partir de um checkout confiável, instale as dependências de desenvolvimento no ambiente de CI (onde `postgrator-cli` está disponível), forneça `DATABASE_URL` como segredo e execute a migration. Exemplo no PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://USUARIO:SENHA@HOST:5432/blog"
node ./node_modules/postgrator-cli/index.js migrate
Remove-Item Env:DATABASE_URL
```

Use a URL e as credenciais reais fornecidas pelo secret manager; não salve esses valores no repositório ou no histórico de scripts.

## Build da imagem Docker

O Dockerfile cria uma imagem de runtime Node.js 24 Alpine com dependências de produção, executa o processo como usuário não-root e escuta na porta `8080`. `.dockerignore` impede que arquivos de ambiente locais sejam enviados no contexto do build.

```powershell
npm run docker:build
```

Isso cria `rocketseat-blog-ia:latest`. Para construir diretamente com uma tag de versão:

```powershell
docker build -t rocketseat-blog-ia:1.0.0 .
```

A imagem não contém valores secretos. Configure `API_KEY`, `DATABASE_URL` e `OPENAI_API_KEY` no ambiente ao iniciar o container.

### Executar a API containerizada com o PostgreSQL local

Com o PostgreSQL local já em execução e publicado em `5433`, inicie a API manualmente:

```powershell
docker run -d --name rocketseat-blog-api --restart unless-stopped -p 8080:8080 --env-file .env.local -e API_HOST=0.0.0.0 -e API_PORT=8080 -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5433/blog rocketseat-blog-ia:latest
```

`host.docker.internal` permite ao container alcançar uma porta publicada no host Docker Desktop. Em produção, prefira o endereço DNS/rede privada do serviço PostgreSQL gerenciado, não esse hostname.

Para acompanhar ou parar a API:

```powershell
docker logs -f rocketseat-blog-api
docker stop rocketseat-blog-api
```

## Publicar a imagem para produção

Exemplo de publicação no Docker Hub; substitua o usuário, o nome da imagem e a versão pelos valores do seu registry/release:

```powershell
docker login -u SEU_USUARIO

docker build -t SEU_USUARIO/rocketseat-blog-ia:1.0.0 .
docker push SEU_USUARIO/rocketseat-blog-ia:1.0.0
```

Não escreva a senha do registry em scripts ou no README. `docker login` solicita autenticação de forma segura. Para GitHub Container Registry ou Azure Container Registry, use o nome completo do registry e o fluxo de autenticação recomendado pelo provedor.

Na plataforma de produção:

1. Configure uma instância PostgreSQL acessível pela aplicação e crie credenciais próprias para a aplicação; evite as credenciais padrão locais.
2. Aplique as migrations de produção antes de direcionar tráfego para a nova versão.
3. Configure `API_HOST=0.0.0.0`, `API_PORT=8080`, `DATABASE_URL`, `API_KEY` e `OPENAI_API_KEY` no serviço de hospedagem/secret manager.
4. Configure a plataforma para obter a imagem publicada e expor a porta `8080` por HTTPS usando seu ingress, proxy ou load balancer.
5. Use uma tag imutável de release (por exemplo, `1.0.0`) em vez de depender de `latest`, e mantenha um plano de rollback da imagem e do banco.

Exemplo de execução com um arquivo de variáveis fora do repositório, chamado `.env.production`:

```powershell
docker run -d --name rocketseat-blog-api -p 8080:8080 --env-file .env.production SEU_USUARIO/rocketseat-blog-ia:1.0.0
```

O arquivo `.env.production` deve conter os valores reais dos segredos, ter acesso restrito e nunca ser versionado. Em serviços gerenciados, prefira cadastrar cada segredo diretamente na plataforma.

## Scripts disponíveis

| Script | Finalidade |
| --- | --- |
| `npm run dev` | Executa a API em desenvolvimento, lendo `.env.local` e reiniciando ao detectar alterações. |
| `npm test` | Executa os testes unitários, de integração e E2E em sequência. |
| `npm run test:unit` | Executa testes unitários com `node:test`; não exige banco. |
| `npm run test:integration` | Executa testes do repositório contra o PostgreSQL local. |
| `npm run test:e2e` | Executa testes HTTP com Supertest e PostgreSQL local. |
| `npm run infra:up` | Inicia o PostgreSQL local via Docker Compose e aguarda a prontidão. |
| `npm run infra:down` | Para o PostgreSQL local sem remover o volume. |
| `npm run migrate:up` | Aplica migrations usando `.env.local`. |
| `npm run migrate:down` | Reverte migrations; pode remover dados. Use com cautela. |
| `npm run docker:build` | Constrói a imagem `rocketseat-blog-ia:latest`. |
| `npm run lint` | Executa Oxlint com correções automáticas em `src`. |
| `npm run format` | Formata `src` e `package.json`. |
| `npm run format:check` | Verifica a formatação de `src` e `package.json`. |

## Segurança e limitações conhecidas

- A API key é um segredo compartilhado em variável de ambiente e protege somente `GET /posts?include=all`; não é um sistema completo de usuários/permissões.
- `PATCH /posts/:id/approve` e `DELETE /posts/:id/reject` não possuem autenticação atualmente.
- Use HTTPS no tráfego externo, segredos fortes e credenciais PostgreSQL exclusivas em produção.
- Não publique `.env.local` ou `.env.production`, não passe segredos como argumentos de build e não os grave na imagem.
- O projeto não possui endpoint de health check da aplicação nem suíte de testes automatizados configurada.
