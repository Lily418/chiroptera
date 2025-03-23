import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Actor from './actor.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Following extends BaseModel {
  @belongsTo(() => Actor, {
    localKey: 'following',
    foreignKey: 'id',
  })
  declare followingActor: BelongsTo<typeof Actor>

  @column()
  declare following: number

  @belongsTo(() => User, {
    localKey: 'follower',
    foreignKey: 'id',
  })
  declare followerUser: BelongsTo<typeof User>

  @column()
  declare follower: number
}
