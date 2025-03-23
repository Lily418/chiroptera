import Actor from '#models/actor'
import Generic from '#models/generic'
import Note from '#models/note'
import { activityStreamValidator } from '#validators/activity_pub_signing_middleware'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { sendSignedRequest } from '../../signing/sign_request.js'
import { upsertActor } from '#services/actor'

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

const handleCreateNote = async ({
  request,
  response,
}: Pick<HttpContext, 'request' | 'response'>) => {
  const body = request.body()
  const actorUrl = new URL(body.actor)
  const attributedUrl = new URL(body.object.attributedTo)

  if (actorUrl.origin !== attributedUrl.origin) {
    logger.info({ actorUrl, attributedUrl }, 'Actor does not match attributed')
    return response.status(401).send({ error: 'Actor does not match attributed' })
  }

  const protocolForActor = actorUrl.protocol.substring(0, actorUrl.protocol.length - 1)

  if (protocolForActor !== 'http' && protocolForActor !== 'https') {
    return response.abort({ error: 'Unsupported actor protocol', protocol: protocolForActor }, 400)
  }

  if (protocolForActor === 'http' && process.env.ALLOW_HTTP_KEYS !== 'true') {
    return response.abort(
      { error: 'http actor protocol not allowed', protocol: protocolForActor },
      400
    )
  }

  const externalActor = await sendSignedRequest({
    keyId: `${process.env.BASE_INSTANCE_ID}/actor`,
    host: actorUrl.host,
    path: actorUrl.pathname,
    protocol: protocolForActor,
    method: 'GET',
  })
  const actorBody: any = await externalActor.json()

  const actor = await upsertActor({
    externalId: actorBody.id,
    inbox: actorBody.inbox,
    outbox: actorBody.outbox,
    preferredUsername: actorBody.preferredUsername,
    url: actorBody.url,
    object: actorBody,
  })

  const publicStream = 'https://www.w3.org/ns/activitystreams#Public'
  const isPublic =
    body.object.to === publicStream || (body.object.cc as string[]).includes(publicStream)

  await actor.related('notes').create({
    id: body.object.id,
    content: body.object.content,
    isPublic: isPublic,
    object: body.object,
  })

  return response.status(200).send({})
}

const handleCreate = async ({ request, response }: Pick<HttpContext, 'request' | 'response'>) => {
  const body = request.body()
  const createType = body.object.type

  switch (createType) {
    case 'Note':
      handleCreateNote({ request, response })
      break
    default:
      handleGeneric({ request, response })
      return
  }
  await Generic.create({
    message: body,
  })
  return response.status(200).send({})
}

const handleDelete = async ({ request, response }: Pick<HttpContext, 'request' | 'response'>) => {
  const body = request.body()
  const actorUrl = new URL(body.actor)
  const idToDelete = body.object.id ?? body.object

  if (!idToDelete || typeof idToDelete !== 'string') {
    logger.info(idToDelete, 'ID To Delete is not a String')
    return handleGeneric({ request, response })
  }

  let idToDeleteUrl
  try {
    idToDeleteUrl = new URL(idToDelete)
  } catch {
    logger.info(idToDelete, 'ID To Delete is not a URL')
    return handleGeneric({ request, response })
  }

  if (idToDeleteUrl.origin !== actorUrl.origin) {
    logger.info({ actorUrl, idToDelete }, 'Actor does not match object to delete')
    return response.status(401).send({ error: 'Actor does not match object to delete' })
  }

  let note = await Note.find(idToDelete)
  if (note) {
    await note.delete()
  }

  let actor = await Actor.find(idToDelete)
  if (actor) {
    await actor.delete()
  }
  return response.status(200).send({})
}

const handleGeneric = async ({ request, response }: Pick<HttpContext, 'request' | 'response'>) => {
  const body = request.body()

  await Generic.create({
    message: body,
  })

  return response.status(200).send({})
}

export default class InboxController {
  async post({ request, response }: HttpContext) {
    const body = request.body()
    await activityStreamValidator.validate(body)
    if (!additionalContextValidation({ request, response })) {
      return
    }

    switch (body.type) {
      case 'Create':
        handleCreate({ request, response })
        return
      case 'Delete':
        handleDelete({ request, response })
        return
      default:
        handleGeneric({ request, response })
        return
    }
  }
}
