import fs from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'

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
      const user = await User.findBy({
        externalActorId: `${process.env.BASE_INSTANCE_ID}/actor/${id}`,
      })

      console.log(await User.all())

      if (!user) {
        return response.abort({}, 404)
      }
      return {
        '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
        'id': `${process.env.BASE_INSTANCE_ID}/actor/${id}`,
        'type': 'Person',
        'preferredUsername': user.username,
        'inbox': `${process.env.BASE_INSTANCE_ID}/inbox`,
        'publicKey': {
          id: `${process.env.BASE_INSTANCE_ID}/actor/${id}#main-key`,
          owner: `${process.env.BASE_INSTANCE_ID}/actor/${id}`,
          publicKeyPem: publicKey,
        },
      }
    }
  }
}
