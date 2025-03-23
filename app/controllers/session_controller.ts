import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async store({ request, response, auth }: HttpContext) {
    const body = request.body()
    const user = await User.verifyCredentials(body.email, body.password)
    await auth.use('web').login(user)
    response.status(200).send({})
  }

  async get({ inertia, session }: HttpContext) {
    console.log(session.flashMessages.all())

    return inertia.render('login/index')
  }
}
