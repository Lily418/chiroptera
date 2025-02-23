import { test } from '@japa/runner'
import { createSignedMessage } from '../../signing/sign_request.js'
import env from '#start/env'
import User from '#models/user'

// we test with the inbox endpoint but in these tests we are interested in correctly signed requests
test.group('Activity Pub Signing Middleware', () => {
  test('should 200 if valid POST message ', async ({ client }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        '@context': ['https://www.w3.org/ns/activitystreams'],
        'actor': 'http://localhost:3333',
      },
    })
    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(200)
  })

  test('should 200 if valid GET message', async ({ client }) => {
    const { headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor/',
      host: process.env.HOST as string,
      path: '/actor/pipistrelle',
      method: 'GET',
    })
    const response = await client.get('/actor/pipistrelle').headers(headers)

    response.assertStatus(200)
  })
    .setup(async () => {
      await User.create({
        email: 'hello@chiroptera.space',
        password: 'testpassword',
        externalActorId: 'https://www.chiroptera.space/actor/pipistrelle',
      })
    })
    .teardown(async () => {
      const user = await User.findBy({ email: 'hello@chiroptera.space' })
      await user?.delete()
    })

  test('it should 401 for post without a body', async ({ client }) => {
    const response = await client.post('/inbox')

    response.assertStatus(400)
  })

  test('it should 400 for missing signature', async ({ client }) => {
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
    response.assertStatus(400)
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
    response.assertStatus(400)
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
    response.assertBody({ error: 'Date Header Could Not Be Parsed' })
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

  test('should 401 if a message with a body which does not have a digest', async ({ client }) => {
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
    response.assertStatus(400)
  })

  test('should 401 if Signature is not properly formatted', async ({ client }, signature) => {
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
    response.assertStatus(400)
  }).with(['keyId=foo', '1="5"', 's='])

  test('should 401 if missing keys', async ({ client, assert }, signatureAndExpectedErrors) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] = (signatureAndExpectedErrors as any).signature

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: (signatureAndExpectedErrors as any).expectedError,
    })
  }).with([
    {
      expectedError: `Missing Key Id in Signature`,
      signature: `headers="host",signature="ABC"`,
    },
    {
      expectedError: `Missing Headers in Signature`,
      signature: `keyId="https://chiroptera.space",signature="ABC"`,
    },
    {
      expectedError: `Missing Signature in Signature`,
      signature: `keyId="https://chiroptera.space",headers="host"`,
    },
    {
      expectedError: `Unsupported signing algorithm. I only know rsa-sha256`,
      signature: `keyId="https://chiroptera.space",headers="host",signature="ABC",algorithm="unknown"`,
    },
    {
      expectedError: `Expected Signature to be a Base64 Encoded string`,
      signature: `keyId="https://chiroptera.space",headers="host",signature="&"`,
    },
  ])

  test('should 401 if keyUrl is not a valid URL', async ({ client, assert }, url) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] = `keyId="${url as any}",headers="host",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: 'Expected Signature to contain a valid URL',
    })
  }).with([
    'www.example.com',
    'https://exa mple.com ',
    'https://examp|e.com',
    'https://',
    'example.com/somepage',
    'http://localhost:abcd',
    'user@example.com',
  ])

  test('401 if actor is not a valid url', async ({ client, assert }, actorUrl) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: actorUrl as any,
      },
    })

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Expected actor property to be a valid URL`,
    })
  }).with([
    'www.example.com',
    'https://exa mple.com ',
    'https://examp|e.com',
    'https://',
    'example.com/somepage',
    'http://localhost:abcd',
    'user@example.com',
  ])

  test('401 if actor origin does not match keyId', async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'https://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'https://chiroptera.space',
      },
    })

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Expected actor property to match key url`,
    })
  })

  test('401 if missing (request-target) in signature', async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] =
      `keyId="http://localhost:3333/actor",headers="host date digest",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Signature is missing one or more required headers`,
    })
  })

  test('401 if missing digest in signature', async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] =
      `keyId="http://localhost:3333/actor",headers="(request-target) date host",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Signature is missing one or more required headers`,
    })
  })

  test('401 if missing date in signature', async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] =
      `keyId="http://localhost:3333/actor",headers="(request-target) digest host",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Signature is missing one or more required headers`,
    })
  })

  test('401 if missing host in signature', async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] =
      `keyId="http://localhost:3333/actor",headers="(request-target) digest date",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Signature is missing one or more required headers`,
    })
  })

  test("401 if a header in signature isn't included in the request", async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] =
      `keyId="http://localhost:3333/actor",headers="(request-target) digest date host negotiate",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Signature includes missing header`,
    })
  })

  test('should reject a bad signature', async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] =
      `keyId="http://localhost:3333/actor",headers="(request-target) digest date host",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)

    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: `Verification failed`,
    })
  })
})

test.group('test no http keys', (group) => {
  group.each.setup(() => {
    env.set('ALLOW_HTTP_KEYS', 'false')
  })

  group.each.teardown(() => {
    env.set('ALLOW_HTTP_KEYS', 'true')
  })

  test('should error if not https url', async ({ client, assert }) => {
    const { documentAsString, headers } = createSignedMessage({
      keyId: 'http://localhost:3333/actor',
      host: process.env.HOST as string,
      path: '/inbox',
      method: 'POST',
      document: {
        actor: 'http://localhost:3333',
      },
    })

    headers['Signature'] = `keyId="http://chiroptera.space",headers="host",signature="ABC="`

    const response = await client.post('/inbox').json(documentAsString).headers(headers)
    response.assertStatus(401)
    assert.containsSubset(response.body(), {
      error: 'Expected Signature to contain a valid URL with https protocol',
    })
  })
})
