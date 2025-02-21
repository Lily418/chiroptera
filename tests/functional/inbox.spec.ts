import { test } from '@japa/runner'
import { createSignedMessage } from '../../signing/sign_request.js'

test.group('Inbox', () => {
  test('should 200 if valid message ', async ({ client }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })
    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(200)
  })
  test('it should 401 for post without a body', async ({ client }) => {
    const response = await client.post('/inbox')

    response.assertStatus(401)
    response.assertBody({ error: 'Expected a request body' })
  })

  test('it should 401 for missing signature', async ({ client }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    delete headers['Signature']

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    response.assertBody({ error: 'Missing Signature Header' })
  })

  test('it should 401 if missing date header', async ({ client }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    delete headers['Date']

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    response.assertBody({ error: 'Missing Date Header' })
  })

  test('should 401 if date header is not a valid date', async ({ client }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Date'] = 'BadDate'

    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(401)
    response.assertBody({ error: 'Date Header Could Not Be Parsed BadDate' })
  })

  test('should 401 if date in header is not within a minute of current time', async ({
    client,
    assert,
  }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Date'] = '2025-01-01T10:00:00Z'

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Date Header Not Within Minute of Server Time.`,
    })
  })

  test('should 401 if a message with a body which does not have a digest', async ({
    client,
    assert,
  }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    delete headers['Digest']

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Digest Header Not Found`,
    })
  })

  test('should 401 if Signature is not properly formatted', async ({
    client,
    assert,
  }, signature) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] = signature as any as string

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Signature not properly formatted`,
    })
  }).with(['keyId=foo', '1="5"', 's='])

  test('')
})
