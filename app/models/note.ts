import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Actor from './actor.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Note extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Actor, {
    localKey: 'attributedTo',
    foreignKey: 'id',
  })
  declare attributedActor: BelongsTo<typeof Actor>

  @column()
  declare attributedTo: number

  @column()
  declare content: string

  @column()
  declare isPublic: boolean

  @column()
  declare external_id: string

  @column()
  declare object: Record<string, any>
}
