/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import logger from '@adonisjs/core/services/logger'
import router from '@adonisjs/core/services/router'
import fs from 'node:fs'
import { middleware } from './kernel.js'
const FeedsController = () => import('#controllers/feed_controller')
const InboxController = () => import('#controllers/inbox_controller')

router.get('/.well-known/webfinger', async () => {
  return {
    subject: 'acct:lily418@noticeboard.events',

    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: 'https://www.noticeboard.events/actor',
      },
    ],
  }
})

router
  .group(() => {
    router.post('/inbox', [InboxController, 'post'])
  })
  .use(middleware.activtyPubSigning())

// For now don't require signatures to get the actor - in the future we can have a public instance actor and expect requests for user actors to be signed
// https://stackoverflow.com/a/77760840
router.get('/actor', async ({ response, request }) => {
  logger.info(`Request to /actor from ip: ${request.ip()}`)
  const publicKey = fs.readFileSync('keys/public.pem', 'utf-8')
  response.header('Content-type', 'application/activity+json')
  return {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],

    'id': 'https://www.noticeboard.events/actor',
    'type': 'Person',
    'preferredUsername': 'lily418',
    'inbox': 'https://www.noticeboard.events/inbox',

    'publicKey': {
      id: 'https://www.noticeboard.events/actor#main-key',
      owner: 'https://www.noticeboard.events/actor',
      publicKeyPem: publicKey,
    },
  }
})

router.get('/', [FeedsController, 'get'])
