import fs from 'node:fs'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { sendSignedRequest } from '../signing/sign_request.js'

export default class Echo extends BaseCommand {
  static commandName = 'echo'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    const document = JSON.parse(fs.readFileSync('create-hello-world.json', 'utf-8'))
    const response = await sendSignedRequest({
      keyId: 'https://www.chiroptera.space/actor',
      host: 'localhost:3333',
      path: '/inbox',
      protocol: 'http',
      method: 'POST',
      document: document,
    })
    console.log('response', response.ok)
    console.log('response', response.status)

    console.log('response', await response.json())
  }
}
