import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import Actor from './actor.js'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'

export default class Note extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Actor)
  declare attributedTo: BelongsTo<typeof Actor>

  @column()
  declare attributedToId: string

  @column()
  declare content: string
}
