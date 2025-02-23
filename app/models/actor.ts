import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Note from './note.js'
import * as relations from '@adonisjs/lucid/types/relations'

export default class Actor extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Note, {
    localKey: 'id',
    foreignKey: 'attributedTo',
  })
  declare notes: relations.HasMany<typeof Note>
}
