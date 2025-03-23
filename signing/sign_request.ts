import fs from 'node:fs'
import { createHash, createSign, constants } from 'node:crypto'

export const createSignedMessage = ({
  keyId,
  host,
  path,
  method,
  document,
}: {
  keyId: string
  host: string
  path: string
  method: 'POST' | 'GET'
  document?: Record<string, any>
}): {
  documentAsString: string
  headers: Record<string, string>
} => {
  const documentAsString = JSON.stringify(document)
  const privateKey = fs.readFileSync('keys/private.pem')
  const digest = document
    ? `SHA-256=${createHash('sha256').update(documentAsString).digest('base64')}`
    : undefined

  const date = new Date().toUTCString()
  const signedString = `(request-target): ${method.toLowerCase()} ${path}\nhost: ${host}\ndate: ${date}${document ? `\ndigest: ${digest}` : ''}`

  var signerObject = createSign('RSA-SHA256')
  signerObject.update(signedString)
  var signature = signerObject.sign(
    { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    'base64'
  )

  const header = `keyId="${keyId}",headers="(request-target) host date${document ? ' digest' : ''}",signature="${signature}"`

  const headers: Record<string, string> = {
    'Accept': 'application/activity+json',
    'Content-Type': 'application/activity+json',
    'Host': host,
    'Date': date,
    'Signature': header,
  }

  if (document && digest) {
    headers['Digest'] = digest
  }

  return {
    documentAsString,
    headers,
  }
}

export const sendSignedRequest = async ({
  keyId,
  host,
  path,
  hash,
  protocol,
  method,
  document,
}: {
  keyId: string
  host: string
  path: string
  hash?: string
  protocol: 'http' | 'https'
  method: 'POST' | 'GET'
  document?: Record<string, any>
}): Promise<Response> => {
  const { documentAsString, headers } = createSignedMessage({
    keyId,
    host,
    path,
    method,
    document,
  })

  console.log(`${protocol}://${host}${path}${hash ?? ''}`, 'About to fetch')
  const response = await fetch(
    new Request(`${protocol}://${host}${path}${hash ?? ''}`, {
      method,
      headers: headers,
      body: documentAsString,
    })
  )

  return response
}
