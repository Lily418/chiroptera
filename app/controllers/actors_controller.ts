import fs from 'node:fs'
import { v4 as uuidv4 } from 'uuid'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'
import { sendSignedRequest } from '../../signing/sign_request.js'
import { upsertActor } from '#services/actor'
import Following from '#models/following'
import Actor from '#models/actor'

export default class ActorsController {
  async get({ request, response }: HttpContext) {
    logger.info(request.params, 'params')
    const id = request.param('id')
    const publicKey = fs.readFileSync('keys/public.pem', 'utf-8')
    response.header('Content-type', 'application/activity+json')

    // No id is an unsigned request for the instance actor
    if (!id) {
      return {
        '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
        'id': `${process.env.BASE_INSTANCE_ID}/actor`,
        'type': 'Application',
        'name': 'chiroptera.space',
        'inbox': `${process.env.BASE_INSTANCE_ID}/inbox`,
        'publicKey': {
          id: `${process.env.BASE_INSTANCE_ID}/actor#main-key`,
          owner: `${process.env.BASE_INSTANCE_ID}/actor`,
          publicKeyPem: publicKey,
        },
      }
    } else {
      console.log('id to search for', `${process.env.BASE_INSTANCE_ID}/actor/${id}`)
      const user = await Actor.query()
        .where({
          external_id: `${process.env.BASE_INSTANCE_ID}/actor/${id}`,
        })
        .andWhereNot({
          local_user: null,
        })
        .first()

      if (!user) {
        return response.abort({}, 404)
      }
      return {
        '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
        'id': `${process.env.BASE_INSTANCE_ID}/actor/${id}`,
        'type': 'Person',
        'preferredUsername': user.preferred_username,
        'inbox': `${process.env.BASE_INSTANCE_ID}/inbox`,
        'publicKey': {
          id: `${process.env.BASE_INSTANCE_ID}/actor/${id}#main-key`,
          owner: `${process.env.BASE_INSTANCE_ID}/actor/${id}`,
          publicKeyPem: publicKey,
        },
      }
    }
  }

  async follow({ request, response, auth }: HttpContext) {
    const authedActor = await Actor.findBy({ local_user: auth.user!.id })
    logger.info(authedActor, 'authedActor')
    const usersExternalId = authedActor!.external_id
    const actorId = decodeURIComponent(request.param('actorId'))
    const uriAsUrl = new URL(actorId)
    const protocolForActor = uriAsUrl.protocol.substring(0, uriAsUrl.protocol.length - 1)

    if (protocolForActor !== 'http' && protocolForActor !== 'https') {
      return response.abort(
        { error: 'Unsupported actor protocol', protocol: protocolForActor },
        400
      )
    }

    if (protocolForActor === 'http' && process.env.ALLOW_HTTP_KEYS !== 'true') {
      return response.abort(
        { error: 'http actor protocol not allowed', protocol: protocolForActor },
        400
      )
    }

    const document = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      'id': `${process.env.BASE_INSTANCE_ID}/${uuidv4()}`,
      'type': 'Follow',
      'actor': usersExternalId,
      'object': actorId,
    }

    logger.info(uriAsUrl, 'uriAsUrl')
    logger.info(document, 'Follow Document')

    const externalActor = await sendSignedRequest({
      keyId: usersExternalId,
      host: uriAsUrl.host,
      path: uriAsUrl.pathname,
      protocol: protocolForActor,
      method: 'GET',
    })

    logger.info(externalActor.status, 'External Actor Status')

    const actorBody: any = await externalActor.json()

    logger.info(actorBody, 'External Actor Body')

    const actor = await upsertActor({
      externalId: actorBody.id,
      inbox: actorBody.inbox,
      outbox: actorBody.outbox,
      preferredUsername: actorBody.preferredUsername,
      url: actorBody.url,
      object: actorBody,
    })

    const actorsInbox = new URL(actorBody.inbox)

    const responseFromFollow = await sendSignedRequest({
      keyId: usersExternalId,
      host: actorsInbox.host,
      path: actorsInbox.pathname,
      protocol: protocolForActor,
      method: 'POST',
      document: document,
    })

    logger.info(responseFromFollow.status, 'Status from follow')

    if (responseFromFollow.ok) {
      await Following.create({
        following: actor.id,
        follower: authedActor!.id,
      })
    }

    return response.status(200).send({})
  }
}
