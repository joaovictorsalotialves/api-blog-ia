import { nanoid } from 'nanoid'
import { z } from 'zod'
import { insertPost } from '../repositories/posts-repository.js'
import { mastra } from '../mastra/index.js'
import { ID } from '../mastra/agents/post-writer-agent.js'

const createPostDraftSchema = z.string().trim().min(1, 'O campo idea é obrigatório.')

const postContentSchema = z.object({
  title: z.string().describe('Título do post'),
  content: z.string().describe('Conteúdo completo do post em Markdown'),
})

export async function createPostDraft(idea) {
  const validatedIdea = createPostDraftSchema.parse(idea)
  const agent = mastra.getAgentById(ID)

  const response = await agent.generate(
    `Crie um post de blog completo baseado na seguinte ideia:\n\n${validatedIdea}`,
    {
      structuredOutput: {
        schema: postContentSchema,
      },
    },
  )

  const { title, content } = response.object

  const post = {
    id: nanoid(),
    title,
    content,
    published_at: null,
    created_at: new Date().toISOString(),
    approved_at: null,
    rejected_at: null,
  }

  return insertPost(post)
}
