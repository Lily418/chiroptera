import Actor from '#models/actor'

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
