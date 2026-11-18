import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateApiKey } from '../../src/auth/validate-api-key.js'

function withApiKey(apiKey, callback) {
  const originalApiKey = process.env.API_KEY

  if (apiKey === undefined) {
    delete process.env.API_KEY
  } else {
    process.env.API_KEY = apiKey
  }

  try {
    callback()
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.API_KEY
    } else {
      process.env.API_KEY = originalApiKey
    }
  }
}

test('accepts a matching Bearer API key', () => {
  withApiKey('secret-key', () => {
    assert.equal(validateApiKey('Bearer secret-key'), true)
  })
})

test('accepts the Bearer scheme case-insensitively', () => {
  withApiKey('secret-key', () => {
    assert.equal(validateApiKey('bearer secret-key'), true)
  })
})

test('rejects missing, malformed, or mismatched credentials', () => {
  withApiKey('secret-key', () => {
    assert.equal(validateApiKey(undefined), false)
    assert.equal(validateApiKey('Basic secret-key'), false)
    assert.equal(validateApiKey('Bearer'), false)
    assert.equal(validateApiKey('Bearer another-key'), false)
  })
})

test('rejects credentials when API_KEY is not configured', () => {
  withApiKey(undefined, () => {
    assert.equal(validateApiKey('Bearer secret-key'), false)
  })
})
