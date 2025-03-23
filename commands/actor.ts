import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { sendSignedRequest } from '../signing/sign_request.js'

export default class Echo extends BaseCommand {
  static commandName = 'actor'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    const response = await sendSignedRequest({
      keyId: 'http://localhost:3333/actor/1',
      host: 'localhost:3333',
      path: '/actor/1',
      protocol: 'http',
      method: 'GET',
    })
    console.log('response', response.ok)
    console.log('response', response.status)

    console.log('response', await response.json())
  }
}
