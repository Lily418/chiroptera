// import { test } from '@japa/runner'
// import { createSignedMessage } from '../../signing/sign_request.js'
// import User from '#models/user'

// test.group('Actor', () => {
//   test('should return instance actor', async ({ client, assert }) => {
//     const { headers } = createSignedMessage({
//       keyId: 'http://localhost:3333/actor/',
//       host: process.env.HOST as string,
//       path: '/actor',
//       method: 'GET',
//     })
//     const response = await client.get('/actor').headers(headers)

//     response.assertStatus(200)
//     const body = response.body()
//     assert.equal(body.id, `${process.env.BASE_INSTANCE_ID}/actor`)
//     assert.equal(body.type, 'Application')
//   })

//   test('should return a user actor', async ({ client, assert }) => {
//     const { headers } = createSignedMessage({
//       keyId: 'http://localhost:3333/actor/',
//       host: process.env.HOST as string,
//       path: '/actor/pipistrelle',
//       method: 'GET',
//     })
//     const response = await client.get('/actor/pipistrelle').headers(headers)

//     response.assertStatus(200)
//     const body = response.body()
//     assert.equal(body.id, `${process.env.BASE_INSTANCE_ID}/actor/pipistrelle`)
//     assert.equal(body.type, 'Person')
//   })
//     .setup(async () => {
//       await User.create({
//         email: 'hello@chiroptera.space',
//         password: 'testpassword',
//         externalActorId: 'https://chiroptera.space/actor/pipistrelle',
//       })
//     })
//     .teardown(async () => {
//       const user = await User.findBy({ email: 'hello@chiroptera.space' })
//       await user?.delete()
//     })

//   test('should 404 for an non existing actor', async ({ client }) => {
//     const { headers } = createSignedMessage({
//       keyId: 'http://localhost:3333/actor/',
//       host: process.env.HOST as string,
//       path: '/actor/rhynchocyonpetersi',
//       method: 'GET',
//     })
//     const response = await client.get('/actor/rhynchocyonpetersi').headers(headers)
//     console.log('response', response)
//     response.assertStatus(404)
//   })
// })
