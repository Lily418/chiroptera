import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import Note from './note.js'
import * as relations from '@adonisjs/lucid/types/relations'
import User from './user.js'
import type { HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Actor extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare external_id: string

  @column()
  declare inbox: string

  @column()
  declare outbox: string

  @column()
  declare preferred_username: string

  @column()
  declare url: string

  @hasMany(() => Note, {
    localKey: 'id',
    foreignKey: 'attributedTo',
  })
  declare notes: relations.HasMany<typeof Note>

  @column()
  declare object: Record<string, any>

  @hasOne(() => User, {
    localKey: 'local_user',
    foreignKey: 'id',
  })
  declare localUser: HasOne<typeof User>

  @column()
  declare local_user: number

  @manyToMany(() => Actor, {
    pivotTable: 'followings',
    localKey: 'id',
    pivotForeignKey: 'follower',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'following',
  })
  declare following: ManyToMany<typeof Actor>
}
