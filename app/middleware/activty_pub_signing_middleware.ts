import type { HttpContext, Request } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import type { NextFn } from '@adonisjs/core/types/http'
import { createHash, verify } from 'node:crypto'
import { sendSignedRequest } from '../../signing/sign_request.js'
import { inboxBodyValidator, inboxHeadersValidator } from '#validators/inbox'

const inboxLogger = logger.use('activity_pub_signing')

const logRequest = ({ request }: { request: Request }) => {
  inboxLogger.info(`Request to /inbox from ip: ${request.ip()}`)
  inboxLogger.info(request.body(), 'Request Body')
  inboxLogger.info(request.headers(), 'Request Headers')
}

const validateHeaders = async ({
  request,
}: {
  request: Request
}): Promise<{ signature: string; date: string; digest: string }> => {
  return await inboxHeadersValidator.validate(request.headers())
}

const validateBody = async ({ request }: { request: Request }) => {
  return await inboxBodyValidator.validate(request.body())
}

export const validateDate = ({
  dateHeader: dateInHeader,
  currentDate: currentTime = new Date(),
}: {
  dateHeader: string
  currentDate?: Date
}): { ok: boolean; message?: string } => {
  const parsedDateInHeader = Date.parse(dateInHeader)
  if (Number.isNaN(parsedDateInHeader)) {
    return {
      ok: false,
      message: `Date Header Could Not Be Parsed`,
    }
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
      'Disregarding inbox message for Date Header Not Within Minute of Server Time'
    )

    return {
      ok: false,
      message: `Date Header Not Within Minute of Server Time.`,
    }
  }

  return {
    ok: true,
  }
}

const validateSignatureParts = ({
  keyId,
  headers,
  signatureAsBase64,
  algorithm,
}: {
  keyId: string
  headers: string
  signatureAsBase64: string
  algorithm: string
}): {
  ok: boolean
  message?: string
} => {
  if (!keyId) {
    return { ok: false, message: 'Missing Key Id in Signature' }
  }

  let keyUrl: URL
  try {
    keyUrl = new URL(keyId)
  } catch {
    inboxLogger.info({ keyId }, 'Expected Signature to contain a valid URL')
    return { ok: false, message: `Expected Signature to contain a valid URL` }
  }

  // Allow HTTP KEYS for local testing only
  if (keyUrl.protocol !== 'https:' && process.env.ALLOW_HTTP_KEYS !== 'true') {
    inboxLogger.info({ keyUrl }, 'Key URL Protocol is not https')

    return { ok: false, message: `Expected Signature to contain a valid URL with https protocol` }
  }

  if (!headers) {
    return { ok: false, message: 'Missing Headers in Signature' }
  }

  if (!signatureAsBase64) {
    return { ok: false, message: 'Missing Signature in Signature' }
  }

  if (algorithm && algorithm !== 'rsa-sha256') {
    inboxLogger.info(algorithm, 'Unsupported signing algorithm specified in signature header')
    return { ok: false, message: 'Unsupported signing algorithm. I only know rsa-sha256' }
  }

  if (!signatureAsBase64.match(/^[A-Za-z0-9+\/=]+=$/)) {
    inboxLogger.info(
      { signature: signatureAsBase64 },
      'Expected Signature to be a Base64 Encoded string'
    )
    return { ok: false, message: `Expected Signature to be a Base64 Encoded string` }
  }

  return { ok: true }
}

export default class ActivtyPubSigningMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    logRequest({ request })

    let knownHeaders: {
      signature: string
      date: string
      digest: string
    }

    try {
      knownHeaders = await validateHeaders({ request })
    } catch (e) {
      logger.info(e, 'Vine header validation error')
      return response
        .status(400)
        .send({ error: 'Request headers failed to validate', messages: e.messages })
    }

    try {
      await validateBody({ request })
    } catch (e) {
      logger.info(e, 'Vine header validation error')
      return response
        .status(400)
        .send({ error: 'Request body failed to validate', messages: e.messages })
    }

    const dateValidation = validateDate({
      dateHeader: knownHeaders.date,
      currentDate: new Date(),
    })

    if (!dateValidation.ok) {
      return response.status(401).send({ error: dateValidation.message })
    }

    const requestBody = request.body()
    const assertedActor = requestBody.actor

    const signatureParts = knownHeaders.signature
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

    const signatureValidation = validateSignatureParts({
      keyId,
      algorithm,
      headers,
      signatureAsBase64,
    })

    if (!signatureValidation.ok) {
      return response.status(401).send({ error: signatureValidation.message })
    }

    const keyUrl = new URL(keyId)
    const host = keyUrl.host
    const path = keyUrl.pathname
    const hash = keyUrl.hash

    // Let's check if the KeyID matches the asserted actor
    try {
      const actorURL = new URL(assertedActor)
      if (actorURL.origin !== keyUrl.origin) {
        inboxLogger.info({ actorURL, keyUrl }, 'actor origin does not match key url origin')
        return response.status(401).send({ error: `Expected actor property to match key url` })
      }
    } catch {
      inboxLogger.info({ assertedActor }, 'actor could not be parsed as a URL')
      return response.status(401).send({ error: `Expected actor property to be a valid URL` })
    }

    const seenHeadersInSignature = {
      date: false,
      host: false,
      digest: false,
      requestTarget: false,
    }

    const rawBody = request.raw()
    let comparisonString
    try {
      comparisonString = headers
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
            const headerValue = request.header(
              String(signedHeaderName).charAt(0).toUpperCase() + String(signedHeaderName).slice(1)
            )

            if (typeof headerValue === 'undefined') {
              throw new Error('Missing header value')
            }

            if (signedHeaderName === 'date') {
              seenHeadersInSignature.date = true
            }

            if (signedHeaderName === 'host') {
              seenHeadersInSignature.host = true
            }

            return `${signedHeaderName}: ${headerValue}`
          }
        })
        .join('\n')
    } catch {
      return response.status(401).send({ error: `Signature includes missing header` })
    }

    const anyRequiredHeadersMissingInSignature = Object.values(seenHeadersInSignature).some(
      (v) => v !== true
    )

    if (anyRequiredHeadersMissingInSignature) {
      inboxLogger.info(seenHeadersInSignature, 'Missing Headers In Signature')
      return response.status(401).send({
        error: `Signature is missing one or more required headers`,
      })
    }

    logger.info('About to send signed request')

    const useHttp = process.env.HOST === 'localhost' && process.env.ALLOW_HTTP_KEYS === 'true'

    const keyResponse = await sendSignedRequest({
      keyId: useHttp
        ? `http://localhost:${process.env.PORT}/actor`
        : `https://${process.env.HOST}/actor`,
      host,
      path,
      protocol: useHttp ? 'http' : 'https',
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

    inboxLogger.info({ comparisonString }, 'We are using the comparison string:')

    const signature = Buffer.from(signatureAsBase64, 'base64')
    const valid = verify('RSA-SHA256', Buffer.from(comparisonString, 'utf-8'), key, signature)

    if (!valid) {
      inboxLogger.info('Failed to validate signature')
      return response.status(401).send({
        error: `Verification failed`,
        comparisonString,
        signature: signatureParts.signature,
      })
    }

    inboxLogger.info(requestBody, 'We have validated the message comes from claimed actor')
    const output = await next()
    return output
  }
}
