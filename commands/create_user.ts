import User from '#models/user'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CreateUser extends BaseCommand {
  static commandName = 'create:user'
  static description = ''

  static options: CommandOptions = {
    startApp: true,
    staysAlive: false,
  }

  async run() {
    const email = await this.prompt.ask('Enter the email')
    const password = await this.prompt.ask('Enter the password')
    const displayName = await this.prompt.ask('Enter the display name')

    await User.create({
      email,
      password,
      displayName,
    })
  }
}
