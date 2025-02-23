import vine from '@vinejs/vine'

export const requestWithBodyHeadersValidator = vine.compile(
  vine.object({
    signature: vine.string().regex(/([a-zA-Z]+="[^"]+",?)+/),
    date: vine.string(),
    digest: vine.string(),
  })
)

export const getHeadersValidator = vine.compile(
  vine.object({
    signature: vine.string().regex(/([a-zA-Z]+="[^"]+",?)+/),
    date: vine.string(),
  })
)

export const bodyValidator = vine.compile(vine.object({}))

export const activityStreamValidator = vine.compile(
  vine.object({
    '@context': vine.unionOfTypes([
      vine.string().sameAs('https://www.w3.org/ns/activitystreams'),
      vine.array(vine.any()),
    ]),
  })
)
