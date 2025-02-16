/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import logger from '@adonisjs/core/services/logger'
import router from '@adonisjs/core/services/router'
import { verify } from 'node:crypto'
import fs from 'node:fs'
import { signedRequest } from '../utils/sign_request.js'

const inboxLogger = logger.use('inbox')

router.get('/actor', async ({ response, request }) => {
  logger.info(`Request to /actor from ip: ${request.ip()}`)
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
  inboxLogger.info(`Request to /inbox from ip: ${request.ip()}`)
  inboxLogger.debug('Request Body', request.body())
  inboxLogger.debug('Request Headers', request.headers())

  // TODO: We are missing security checks which would be required in a serious production application
  // For example:
  // "The request contains a Date header. Compare it with current date and time within a reasonable time window to prevent replay attacks.
  // It is advisable that requests with payloads in the body also send a Digest header, and that header be signed along in the signature. If it’s present, it should be checked as another special case within the comparison string: Instead of taking the digest value from the received header, recompute it from the received body.
  // While this proves the request comes from an actor, what if the payload contains an attribution to someone else? In reality you’d want to check that both are the same, otherwise one actor could forge messages from other people."
  // See https://blog.joinmastodon.org/2018/07/how-to-make-friends-and-verify-requests/
  const signatureHeader = request.header('Signature')
  if (!signatureHeader) {
    inboxLogger.info('Disregarding inbox message missing signature header')
    return response.status(401).send({ error: 'Missing Signature Header' })
  }

  const signatureParts = signatureHeader
    .split(',')
    .map((signaturePart) => {
      const keyValue = signaturePart.split(/=/)
      const key = keyValue[0]
      const valueQuoted = keyValue.slice(1).join('=')
      const stripQuotes = valueQuoted.replace(/^"/, '').replace(/"$/, '')
      return { [key]: stripQuotes }
    })
    .reduce((acc, v) => {
      return Object.assign(acc, v)
    }, {})

  inboxLogger.info('Parsed Signature Header', signatureParts)

  const keyId = signatureParts.keyId
  const algorithm = signatureParts.algorithm
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

  if (algorithm && algorithm !== 'rsa-sha256') {
    inboxLogger.info('Unsupported signing algorithm specified in signature header', algorithm)
    return response
      .status(401)
      .send({ error: 'Unsupported signing algorithm. I only know rsa-sha256' })
  }

  const signature = Buffer.from(signatureParts.signature, 'base64')

  const keyUrl = new URL(keyId)

  const host = keyUrl.host
  const path = keyUrl.pathname
  const hash = keyUrl.hash

  const keyResponse = await signedRequest({ host, path, protocol: 'https', method: 'GET', hash })

  if (!keyResponse.ok) {
    return response.status(401).send({ error: `Failed to fetch fetch ${keyId}` })
  }

  inboxLogger.info('Signature header contained the key id', keyId)
  const keyResponseJson = (await keyResponse.json()) as any
  inboxLogger.info('Key id response is', keyResponseJson)

  const key = keyResponseJson.publicKey.publicKeyPem
  if (!key) {
    inboxLogger.info('Key id response did not contain public key')
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

  inboxLogger.info('We are using the comparison string:', comparisonString)

  const valid = verify('RSA-SHA256', Buffer.from(comparisonString, 'utf-8'), key, signature)

  if (!valid) {
    inboxLogger.info('Failed to validate signature')
    return response.status(401).send({
      error: `Verification failed for ${request.header('host')} ${keyId}`,
      comparisonString,
      signature: signatureParts.signature,
    })
  }

  inboxLogger.info('We have validated the message', request.body())
  return {}
})

// router.on('/').renderInertia('home')
