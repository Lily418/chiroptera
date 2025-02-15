/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import fs from 'node:fs'

router.on('/').renderInertia('home')
router.get('/actor', async () => {
  const publicKey = fs.readFileSync('keys/public.pem', 'utf-8')
  return {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],

    'id': 'https://noticeboard.events/actor',
    'type': 'Person',
    'preferredUsername': 'lily418',
    'inbox': 'https://noticeboard.events/inbox',

    'publicKey': {
      id: 'https://noticeboard.events/actor#main-key',
      owner: 'https://noticeboard.events/actor',
      publicKeyPem: publicKey,
    },
  }
})

router.get('/.well-known/webfinger', async () => {
  return {
    subject: 'acct:lily418@noticeboard.events',

    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: 'https://noticeboard.events/actor',
      },
    ],
  }
})

router.post('/inbox', async ({ request }) => {
  console.log('request', request)
})
