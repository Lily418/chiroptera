import Actor from '#models/actor'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import { sendSignedRequest } from '../../signing/sign_request.js'
import Note from '#models/note'

export const upsertActor = async ({
  externalId,
  inbox,
  outbox,
  preferredUsername,
  url,
  object,
}: {
  externalId: string
  inbox: string
  outbox: string
  preferredUsername: string
  url: string
  object: Record<string, any>
}) => {
  const actor = await Actor.findBy({ external_id: externalId })
  if (actor) {
    actor.preferred_username = preferredUsername
    actor.url = url
    actor.inbox = inbox
    actor.outbox = outbox
    actor.object = object
    return await actor.save()
  } else {
    return await Actor.create({
      external_id: externalId,
      inbox: inbox,
      outbox,
      preferred_username: preferredUsername,
      url: url,
      object: object,
    })
  }
}

export const fetchOutbox = async ({ actorId, userId }: { actorId: number; userId: number }) => {
  const user = await User.query().where({ id: userId }).preload('actor').first()
  const actor = await Actor.find(actorId)

  const outboxUrl = new URL(actor!.outbox)

  const outbox = await sendSignedRequest({
    keyId: user!.actor.external_id,
    host: outboxUrl.host,
    path: outboxUrl.pathname,
    protocol: 'https',
    method: 'GET',
  })

  logger.info(outbox.status, 'Outbox status')

  const outboxBody: any = await outbox.json()
  logger.info(outboxBody, 'Outbox Body')

  const first = outboxBody.first
  let pageUrl: URL | null = new URL(first)
  logger.info(pageUrl.searchParams.toString(), 'params')

  while (pageUrl) {
    const page = await sendSignedRequest({
      keyId: user!.actor.external_id,
      host: pageUrl.host,
      path: `${pageUrl.pathname}?${pageUrl.searchParams.toString()}`,
      protocol: 'https',
      method: 'GET',
    })

    const pageJson: any = await page.json()

    await Promise.all(
      pageJson.orderedItems.map(async (orderedItem: any) => {
        if (
          orderedItem.type === 'Create' &&
          orderedItem.object.attributedTo === actor!.external_id
        ) {
          const publicStream = 'https://www.w3.org/ns/activitystreams#Public'
          const isPublic =
            orderedItem.object.to === publicStream ||
            (orderedItem.object.cc as string[]).includes(publicStream)

          const existingNote = await Note.findBy({
            external_id: orderedItem.object.id,
          })

          if (!existingNote) {
            await actor!.related('notes').create({
              external_id: orderedItem.object.id,
              content: orderedItem.object.content,
              isPublic: isPublic,
              object: orderedItem.object,
            })
          } else {
            existingNote.content = orderedItem.object.content
            existingNote.save()
          }
        }
      })
    )

    pageUrl = pageJson.next
  }
}
