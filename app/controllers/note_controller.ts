import { HttpContext } from '@adonisjs/core/http'

export default class InboxController {
  async create({ request, response }: HttpContext) {
    const body = request.body()
  }
}
