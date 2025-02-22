import { inboxActivityStreamValidator } from '#validators/inbox'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

const additionalContextValidation = ({
  request,
  response,
}: Pick<HttpContext, 'request' | 'response'>): boolean => {
  const body = request.body()
  if (Array.isArray(body['@context'])) {
    if (!body['@context'].includes('https://www.w3.org/ns/activitystreams')) {
      logger.info(request.body, 'Rejected request with no activity stream context')
      response.status(400).send({ error: 'Expected activity stream context' })
      return false
    }
  }

  return true
}

export default class InboxController {
  async post({ request, response }: HttpContext) {
    // TODO: We have ensured that the actor is genuine but this doesn't not mean the actor has the permission to perform the action they are requesting, we must check this now
    const body = request.body()
    await inboxActivityStreamValidator.validate(body)
    if (!additionalContextValidation({ request, response })) {
      return
    }

    logger.info('Received message', body)
  }
}
