import Actor from '#models/actor'
import User from '#models/user'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CreateUser extends BaseCommand {
  static commandName = 'create:local_actor'
  static description = ''

  static options: CommandOptions = {
    startApp: true,
    staysAlive: false,
  }

  async run() {
    const email = await this.prompt.ask('Enter the email')
    const password = await this.prompt.ask('Enter the password')
    const displayName = await this.prompt.ask('Enter the display name')
    const slug = await this.prompt.ask('Enter slug')

    const user = await User.create({
      email,
      password,
    })

    await Actor.create({
      external_id: `${process.env.BASE_INSTANCE_ID}/actor/${slug}`,
      inbox: `${process.env.BASE_INSTANCE_ID}/inbox`,
      outbox: `${process.env.BASE_INSTANCE_ID}/actor/outbox`,
      preferred_username: displayName,
      url: `${process.env.BASE_INSTANCE_ID}/profile/${user.id}`,
      local_user: user.id,
    })
  }
}
