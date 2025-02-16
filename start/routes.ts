/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { base64 } from '@adonisjs/core/helpers'
import router from '@adonisjs/core/services/router'
import { verify } from 'node:crypto'
import fs from 'node:fs'

router.get('/actor', async ({ response, request }) => {
  console.log('Request to /actor', request.ip())
  const publicKey = fs.readFileSync('keys/public.pem', 'utf-8')
  response.header('Content-type', 'application/activity+json')
  return {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],

    'id': 'https://www.noticeboard.events/actor',
    'type': 'Person',
    'preferredUsername': 'lily418',
    'inbox': 'https://www.noticeboard.events/inbox',

    'publicKey': {
      id: 'https://www.noticeboard.events/actor#main-key',
      owner: 'https://www.noticeboard.events/actor',
      publicKeyPem: publicKey,
    },
  }
})

router.get('/.well-known/webfinger', async () => {
  return {
    subject: 'acct:lily418@noticeboard.events',

    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: 'https://www.noticeboard.events/actor',
      },
    ],
  }
})

router.post('/inbox', async ({ request, response }) => {
  // TODO: We are missing security checks which would be required in a serious production application
  // For example:
  // "The request contains a Date header. Compare it with current date and time within a reasonable time window to prevent replay attacks.
  // It is advisable that requests with payloads in the body also send a Digest header, and that header be signed along in the signature. If it’s present, it should be checked as another special case within the comparison string: Instead of taking the digest value from the received header, recompute it from the received body.
  // While this proves the request comes from an actor, what if the payload contains an attribution to someone else? In reality you’d want to check that both are the same, otherwise one actor could forge messages from other people."
  // See https://blog.joinmastodon.org/2018/07/how-to-make-friends-and-verify-requests/
  const signatureHeader = request.header('Signature')
  if (!signatureHeader) {
    console.log('Message has no signature, disregard')
    return response.status(401).send({ error: 'Missing Signature Header' })
  }

  const signatureParts = signatureHeader
    .split(',')
    .map((signaturePart) => {
      console.log('signaturePart', signaturePart)
      const keyValue = signaturePart.split(/=/)
      const key = keyValue[0]
      const valueQuoted = keyValue.slice(1).join('=')

      console.log('key', key)
      console.log('valueQuoted', valueQuoted)
      const stripQuotes = valueQuoted.replace(/^"/, '').replace(/"$/, '')
      console.log('stripQuotes', stripQuotes)
      return { [key]: stripQuotes }
    })
    .reduce((acc, v) => {
      return Object.assign(acc, v)
    }, {})

  console.log(signatureParts)

  const keyId = signatureParts.keyId
  const headers = signatureParts.headers
  const signatureAsBase64 = signatureParts.signature

  if (!keyId) {
    return response.status(401).send({ error: 'Missing Key Id in Signature' })
  }

  if (!headers) {
    return response.status(401).send({ error: 'Missing Headers in Signature' })
  }

  if (!signatureAsBase64) {
    return response.status(401).send({ error: 'Missing Signature in Signature' })
  }

  const signature = Buffer.from(signatureParts.signature, 'base64')

  const keyResponse = await fetch(
    new Request(keyId, {
      method: 'GET',
    })
  )

  if (!keyResponse.ok) {
    return response.status(401).send({ error: `Failed to fetch fetch ${keyId}` })
  }

  const keyResponseJson = (await keyResponse.json()) as any
  const key = keyResponseJson.publicKey.publicKeyPem
  console.log('key', key)
  if (!key) {
    return response.status(401).send({ error: `Failed to fetch fetch ${keyId}` })
  }

  const comparisonString = headers
    .split(' ')
    .map((signedHeaderName) => {
      if (signedHeaderName === '(request-target)') {
        return '(request-target): post /inbox'
      } else {
        return `${signedHeaderName}: ${request.header(String(signedHeaderName).charAt(0).toUpperCase() + String(signedHeaderName).slice(1))}`
      }
    })
    .join('\n')

  console.log('comparisonString', comparisonString)

  const valid = verify('RSA-SHA256', Buffer.from(comparisonString, 'utf-8'), key, signature)

  if (!valid) {
    return response.status(401).send({
      error: `Verification failed for ${request.header('host')} ${keyId}`,
      comparisonString,
      signature: signatureParts.signature,
    })
  }

  console.log('request', request.body())
  return {}
})

// router.on('/').renderInertia('home')
