import fs from 'node:fs'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { signedRequest } from '../utils/sign_request.js'

export default class Echo extends BaseCommand {
  static commandName = 'echo'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    const document = JSON.parse(fs.readFileSync('create-hello-world.json', 'utf-8'))
    await signedRequest({
      host: 'localhost:3333',
      path: '/inbox',
      protocol: 'http',
      method: 'POST',
      document: document,
    })
    // const privateKey = fs.readFileSync('keys/private.pem')
    // const digest = `SHA-256=${createHash('sha256').update(document).digest('base64')}`
    // const date = new Date().toUTCString()

    // const signedString = `(request-target): post /inbox\nhost: localhost:3333\ndate: ${date}\ndigest: ${digest}`

    // var signerObject = createSign('RSA-SHA256')
    // signerObject.update(signedString)
    // var signature = signerObject.sign(
    //   { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    //   'base64'
    // )

    // const header =
    //   'keyId="https://www.noticeboard.events/actor",headers="(request-target) host date digest",signature="' +
    //   signature +
    //   '"'

    // try {
    //   const response = await fetch(
    //     new Request('http://localhost:3333/inbox', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/activity+json',
    //         'Host': 'localhost:3333',
    //         'Date': date,
    //         'Signature': header,
    //         'Digest': digest,
    //       },
    //       body: document,
    //     })
    //   )
    //   console.log('response', response)
    //   console.log('response.status', response.status)
    //   console.log('response.ok', response.ok)
    //   console.log('response.json', await response.json())
    // } catch (e) {
    //   console.log('e', e)
    // }
  }
}
