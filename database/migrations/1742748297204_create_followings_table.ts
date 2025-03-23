import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('following').unsigned()
      table.foreign('following').references('actors.id')
      table.integer('follower').unsigned()
      table.foreign('follower').references('actors.id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
