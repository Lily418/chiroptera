import vine from '@vinejs/vine'

export const inboxHeadersValidator = vine.compile(
  vine.object({
    signature: vine.string().regex(/([a-zA-Z]+="[^"]+",?)+/),
    date: vine.string(),
    digest: vine.string(),
  })
)

export const inboxBodyValidator = vine.compile(vine.object({}))
