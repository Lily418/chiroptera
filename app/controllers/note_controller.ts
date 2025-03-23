import Actor from '#models/actor'
import { upsertNote } from '#services/note'
import { HttpContext } from '@adonisjs/core/http'
import { v4 as uuidv4 } from 'uuid'
import logger from '@adonisjs/core/services/logger'

export default class InboxController {
  async create({ request, response, auth }: HttpContext) {
    const body = request.body()
    logger.info(body, 'body')
    const authedActor = await Actor.findBy({ local_user: auth.user!.id })
    const noteObject = {
      id: `${process.env.BASE_INSTANCE_ID}/note/${uuidv4()}`,
      content: body.content,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      cc: [],
    }
    await upsertNote(authedActor!, noteObject)
    return response.status(200).send({})
  }
}
