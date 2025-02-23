import { DateTime } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import Note from './note.js'
import * as relations from '@adonisjs/lucid/types/relations'
import Actor from './actor.js'

export default class NoteAudience extends BaseModel {
  @hasOne(() => Note, {
    localKey: 'noteId',
    foreignKey: 'id',
  })
  declare note: relations.HasOne<typeof Note>

  @hasOne(() => Actor, {
    localKey: 'actorId',
    foreignKey: 'id',
  })
  declare actor: relations.HasOne<typeof Actor>

  @column()
  declare actorId: string

  @column()
  declare noteId: string
}
