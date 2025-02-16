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
import { createHash, verify } from 'node:crypto'
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
  inboxLogger.info(request.body(), 'Request Body')
  inboxLogger.info(request.headers(), 'Request Headers')

  const rawBody = request.raw()
  if (!rawBody) {
    inboxLogger.info('Missing raw body')
    return response.status(401).send({ error: 'Expected a request body' })
  }

  const dateHeader = request.header('Date')
  if (!dateHeader) {
    inboxLogger.info('Disregarding inbox message for Missing Date Header')
    return response.status(401).send({ error: 'Missing Date Header' })
  }

  const parsedDateInHeader = Date.parse(dateHeader)
  const currentTime = new Date()

  if (Number.isNaN(parsedDateInHeader)) {
    return response
      .status(401)
      .send({ error: `Date Header Could Not Be Parsed ${parsedDateInHeader}` })
  }
  if (
    parsedDateInHeader < currentTime.setMinutes(currentTime.getMinutes() - 1) ||
    parsedDateInHeader > currentTime.setMinutes(currentTime.getMinutes() + 1)
  ) {
    inboxLogger.info(
      {
        dateHeader: new Date(parsedDateInHeader).toUTCString(),
        currentTime: currentTime.toUTCString(),
      },
      'Disregarding inbox message for Missing Date Header'
    )

    return response.status(401).send({
      error: `Date Header Not Within Minute of Server Time.`,
      dateHeader: new Date(parsedDateInHeader).toUTCString(),
      currentTime: currentTime.toUTCString(),
    })
  }

  const digestHeader = request.header('Digest')
  if (!digestHeader) {
    inboxLogger.info('Disregarding inbox message for missing digest')
    return response.status(401).send({ error: `Digest Header Not Found` })
  }

  // TODO: We are missing security checks which would be required in a serious production application
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

  inboxLogger.info(signatureParts, 'Parsed Signature Header')

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
    inboxLogger.info(algorithm, 'Unsupported signing algorithm specified in signature header')
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

  inboxLogger.info({ keyId }, 'Signature header contained the key id')
  const keyResponseJson = (await keyResponse.json()) as any
  inboxLogger.info(keyResponseJson, 'Key id response is')

  const key = keyResponseJson.publicKey.publicKeyPem
  if (!key) {
    inboxLogger.info('Key id response did not contain public key')
    return response.status(401).send({ error: `Failed to fetch fetch ${keyId}` })
  }
  const expectedDigest = `SHA-256=${createHash('sha256').update(rawBody).digest('base64')}`

  // We are checking for the presence of mandatory headers in the comparison string we generate, ideally we would do this in a more structured way
  // which checks that any headers we use are included in the signature.
  const seenHeadersInSignature = {
    date: false,
    host: false,
    digest: false,
    requestTarget: false,
  }

  const comparisonString = headers
    .split(' ')
    .map((signedHeaderName) => {
      if (signedHeaderName === '(request-target)') {
        seenHeadersInSignature.requestTarget = true
        return '(request-target): post /inbox'
      } else if (signedHeaderName === 'digest') {
        seenHeadersInSignature.digest = true
        return `digest: ${expectedDigest}`
      } else {
        if (signedHeaderName === 'date') {
          seenHeadersInSignature.date = true
        }

        if (signedHeaderName === 'host') {
          seenHeadersInSignature.host = true
        }

        return `${signedHeaderName}: ${request.header(String(signedHeaderName).charAt(0).toUpperCase() + String(signedHeaderName).slice(1))}`
      }
    })
    .join('\n')

  const anyRequiredHeadersMissingInSignature = Object.values(seenHeadersInSignature).some(
    (v) => v !== true
  )

  if (anyRequiredHeadersMissingInSignature) {
    inboxLogger.info(seenHeadersInSignature, 'Missing Headers In Signature')
    return response.status(401).send({
      error: `Signature is missing one or more required headers`,
    })
  }

  inboxLogger.info({ comparisonString }, 'We are using the comparison string:')

  const valid = verify('RSA-SHA256', Buffer.from(comparisonString, 'utf-8'), key, signature)

  if (!valid) {
    inboxLogger.info('Failed to validate signature')
    return response.status(401).send({
      error: `Verification failed for ${request.header('host')} ${keyId}`,
      comparisonString,
      signature: signatureParts.signature,
    })
  }

  const requestBody = request.body()

  inboxLogger.info(requestBody, 'We have validated the message')
  return {}
})

// router.on('/').renderInertia('home')
