/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
const ActorsController = () => import('#controllers/actors_controller')
const SessionController = () => import('#controllers/session_controller')
const FeedsController = () => import('#controllers/feed_controller')
const InboxController = () => import('#controllers/inbox_controller')

router.get('/.well-known/webfinger', async () => {
  return {
    subject: 'acct:lily418@chiroptera.space',

    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: 'https://www.chiroptera.space/actor',
      },
    ],
  }
})

// For now don't require signatures to get the actor - in the future we can have a public instance actor and expect requests for user actors to be signed
// https://stackoverflow.com/a/77760840
router.get('/actor', [ActorsController, 'get'])

router
  .group(() => {
    router.post('/inbox', [InboxController, 'post'])
    router.get('/actor/:id', [ActorsController, 'get'])
  })
  .use(middleware.activityPubSigning())

router.post('/api/login', [SessionController, 'store'])

router.get('/', [FeedsController, 'getPublic'])
router.get('/login', [SessionController, 'get'])

router
  .group(() => {
    router.get('/feed', [FeedsController, 'getAuthenticated'])
    router.get('/searchResults', [FeedsController, 'searchResults'])
    router.post('/api/actor/:actorId/follow', [ActorsController, 'follow'])
  })
  .use(middleware.auth())
