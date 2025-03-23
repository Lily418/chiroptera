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
const NoteController = () => import('#controllers/note_controller')

router.get('/.well-known/webfinger', async () => {
  return {
    subject: 'acct:pipistrelle@chiroptera.space',
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: 'https://chiroptera.space/actor/pipistrelle',
      },
    ],
  }
})

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
    router.get('/profile/:actorId', [FeedsController, 'profileFeed'])
    router.post('/api/actor/:actorId/follow', [ActorsController, 'follow'])
    router.post('/note', [NoteController, 'create'])
  })
  .use(middleware.auth())
