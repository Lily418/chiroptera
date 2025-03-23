import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Actor from './actor.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Following extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @belongsTo(() => Actor, {
    localKey: 'following',
    foreignKey: 'id',
  })
  declare followingActor: BelongsTo<typeof Actor>

  @column()
  declare following: number

  @belongsTo(() => Actor, {
    localKey: 'follower',
    foreignKey: 'id',
  })
  declare followerUser: BelongsTo<typeof Actor>

  @column()
  declare follower: number
}
