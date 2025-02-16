import fs from 'node:fs'
import { createHash, createSign, constants } from 'node:crypto'

export const signedRequest = async (
  host: string,
  path: string,
  protocol: 'http' | 'https',
  method: 'POST' | 'GET',
  document?: Record<string, any>
): Promise<Response> => {
  const documentAsString = JSON.stringify(document)
  const privateKey = fs.readFileSync('keys/private.pem')
  const digest = document
    ? `SHA-256=${createHash('sha256').update(documentAsString).digest('base64')}`
    : undefined
  const date = new Date().toUTCString()
  const signedString = `(request-target): ${method.toLowerCase()} /${path}\nhost: ${host}\ndate: ${date}${document ? `\ndigest: ${digest}` : ''}`

  console.log('Signed String', signedString)

  var signerObject = createSign('RSA-SHA256')
  signerObject.update(signedString)
  var signature = signerObject.sign(
    { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    'base64'
  )

  const header =
    `keyId="https://www.noticeboard.events/actor",headers="(request-target) host date${document ? ' digest' : ''}",signature="` +
    signature +
    '"'

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

  const response = await fetch(
    new Request(`${protocol}://${host}${path}`, {
      method,
      headers: headers,
      body: documentAsString,
    })
  )
  return response
}
