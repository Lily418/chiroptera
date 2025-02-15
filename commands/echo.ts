import fs from 'node:fs'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { createHash, createSign, constants } from 'node:crypto'

export default class Echo extends BaseCommand {
  static commandName = 'echo'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    const message = fs.readFileSync('keys/create-hello-world.json', 'utf-8')
    const privateKey = fs.readFileSync('keys/private.pem', 'utf-8')

    const digest = 'SHA-256=' + createHash('sha256').update(message).digest('base64')
    const date = new Date().toUTCString()
    const signedString = `(request-target): post /inbox\nhost: mastodon.social\ndate: ${date}\ndigest: ${digest}`

    var signerObject = createSign('RSA-SHA256')
    signerObject.update(signedString)
    var signature = signerObject.sign(
      { key: privateKey, padding: constants.RSA_PKCS1_PSS_PADDING },
      'base64'
    )

    const header =
      'keyId="https://noticeboard.events/actor",headers="(request-target) host date digest",signature="' +
      signature +
      '"'

    console.info('signature: %s', signature)

    // HTTP.headers({ 'Host': 'mastodon.social', 'Date': date, 'Signature': header, 'Digest': digest })
    // .post('https://mastodon.social/inbox', body: document)

    const response = await fetch(
      new Request('https://lgbtqia.space/inbox', {
        method: 'POST',
        headers: {
          Host: 'lgbtqia.space',
          Date: date,
          Signature: header,
          Digest: digest,
        },
        body: message,
      })
    )

    console.log('response', response)
    console.log('response.status', response.status)
    console.log('response.ok', response.ok)
    console.log('response.json', await response.json())
  }
}

// https://lgbtqia.space/.well-known/webfinger?resource=acct:PurpleOrchid@lgbtqia.space
// https://mastodon.social/.well-known/webfinger?resource=acct:@Gargron@mastodon.social
