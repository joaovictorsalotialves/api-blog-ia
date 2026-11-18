import { createHash, timingSafeEqual } from 'node:crypto'

function hash(value) {
  return createHash('sha256').update(value).digest()
}

export function validateApiKey(authorizationHeader) {
  const expectedApiKey = process.env.API_KEY
  const token = authorizationHeader?.match(/^Bearer\s+([^\s]+)$/i)?.[1]

  if (!expectedApiKey || !token) {
    return false
  }

  return timingSafeEqual(hash(token), hash(expectedApiKey))
}
