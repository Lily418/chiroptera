import vine from '@vinejs/vine'

export const inboxHeadersValidator = vine.compile(
  vine.object({
    signature: vine.string().regex(/([a-zA-Z]+="[^"]+",?)+/),
    date: vine.string(),
    digest: vine.string(),
  })
)

export const inboxBodyValidator = vine.compile(vine.object({}))

export const inboxActivityStreamValidator = vine.compile(
  vine.object({
    '@context': vine.unionOfTypes([
      vine.literal('https://www.w3.org/ns/activitystreams'),
      vine.array(vine.any()),
    ]),
  })
)
