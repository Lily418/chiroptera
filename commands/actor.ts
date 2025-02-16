import fs from 'node:fs'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { signedRequest } from '../signing/sign_request.js'

export default class Echo extends BaseCommand {
  static commandName = 'actor'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    const response = await signedRequest({
      host: 'localhost:3333',
      path: '/actor',
      protocol: 'http',
      method: 'GET',
    })
    console.log('response', response.ok)
    console.log('response', response.status)

    console.log('response', await response.json())
  }
}
