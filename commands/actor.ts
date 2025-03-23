import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { sendSignedRequest } from '../signing/sign_request.js'

export default class Echo extends BaseCommand {
  static commandName = 'actor'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    const response = await sendSignedRequest({
      keyId: 'https://chiroptera.space/actor',
      host: 'chiroptera.space',
      path: '/actor/ghost',
      protocol: 'https',
      method: 'GET',
    })
    console.log('response', response.ok)
    console.log('response', response.status)

    console.log('response', await response.json())
  }
}
