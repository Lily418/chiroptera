import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import type { NextFn } from '@adonisjs/core/types/http'
import { createHash, verify } from 'node:crypto'
import { sendSignedRequest } from '../../signing/sign_request.js'

const inboxLogger = logger.use('activity_pub_signing')

export default class ActivtyPubSigningMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    inboxLogger.info(`Request to /inbox from ip: ${request.ip()}`)
    inboxLogger.info(request.body(), 'Request Body')
    inboxLogger.info(request.headers(), 'Request Headers')

    const rawBody = request.raw()
    if (!rawBody && request.method() !== 'GET') {
      inboxLogger.info('Missing raw body')
      return response.status(401).send({ error: 'Expected a request body' })
    }

    const signatureHeader = request.header('Signature')
    if (!signatureHeader) {
      inboxLogger.info('Disregarding inbox message missing signature header')
      return response.status(401).send({ error: 'Missing Signature Header' })
    }

    const dateHeader = request.header('Date')
    if (!dateHeader) {
      inboxLogger.info('Disregarding inbox message for Missing Date Header')
      return response.status(401).send({ error: 'Missing Date Header' })
    }

    const parsedDateInHeader = Date.parse(dateHeader)
    const currentTime = new Date()

    if (Number.isNaN(parsedDateInHeader)) {
      return response.status(401).send({ error: `Date Header Could Not Be Parsed ${dateHeader}` })
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
    if (!digestHeader && request.raw()) {
      inboxLogger.info('Disregarding inbox message for missing digest')
      return response.status(401).send({ error: `Digest Header Not Found` })
    }

    const requestBody = request.body()
    const assertedActor = requestBody.actor

    if (!signatureHeader.match(/([a-zA-Z]+="[^"]+",?)+/)) {
      inboxLogger.info(
        { signatureHeader },
        'Disregarding inbox message for badly formatted Signature header'
      )
      return response.status(401).send({ error: `Signature not properly formatted` })
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

    let keyUrl
    try {
      keyUrl = new URL(keyId)
    } catch {
      inboxLogger.info({ keyUrl }, 'Expected Signature to contain a valid URL')
      return response.status(400).send({ error: `Expected Signature to contain a valid URL` })
    }

    // Allow HTTP KEYS for local testing only
    if (keyUrl.protocol !== 'https:' && !process.env.ALLOW_HTTP_KEYS) {
      inboxLogger.info({ keyUrl }, 'Key URL Protocol is not https')

      return response
        .status(400)
        .send({ error: `Expected Signature to contain a valid URL with https protocol` })
    }

    // Check for loop
    // if (keyUrl.hostname === process.env.HOST) {
    //   inboxLogger.info({ keyUrl }, 'Key URL Protocol is same host')
    //   return response
    //     .status(400)
    //     .send({ error: `Expected Signature to contain a valid URL which is not the current host` })
    // }

    const host = keyUrl.host
    const path = keyUrl.pathname
    const hash = keyUrl.hash

    // Let's check if the KeyID matches the asserted actor
    if (request.method() !== 'GET') {
      try {
        const actorURL = new URL(assertedActor)
        if (actorURL.host !== keyUrl.host) {
          inboxLogger.info({ actorURL, keyUrl }, 'actor host does not match key url host')
          return response
            .status(400)
            .send({ error: `Expected actor property to match key url ${assertedActor}` })
        }
      } catch {
        inboxLogger.info({ assertedActor }, 'actor could not be parsed as a URL')
        return response
          .status(400)
          .send({ error: `Expected actor property to be a valid URL ${assertedActor}` })
      }
    }
    logger.info('About to send signed request')

    const keyResponse = await sendSignedRequest({
      keyId:
        process.env.HOST === 'localhost'
          ? `http://localhost:${process.env.PORT}/actor`
          : `https://${process.env.HOST}/actor`,
      host,
      path,
      protocol: process.env.HOST === 'localhost' ? 'http' : 'https',
      method: 'GET',
      hash,
    })

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
    // We are checking for the presence of mandatory headers in the comparison string we generate, ideally we would do this in a more structured way
    // which checks that any headers we use are included in the signature.
    const seenHeadersInSignature = {
      date: false,
      host: false,
      digest: request.method() === 'GET' ? true : false,
      requestTarget: false,
    }

    const comparisonString = headers
      .split(' ')
      .map((signedHeaderName) => {
        if (signedHeaderName === '(request-target)') {
          seenHeadersInSignature.requestTarget = true
          return `(request-target): ${request.method().toLowerCase()} ${request.parsedUrl.pathname}`
        } else if (signedHeaderName === 'digest') {
          seenHeadersInSignature.digest = true
          const expectedDigest = `SHA-256=${createHash('sha256').update(rawBody!).digest('base64')}`
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

    inboxLogger.info(requestBody, 'We have validated the message comes from claimed actor')
    const output = await next()
    return output
  }
}
