import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actors'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('local_user').unsigned().unique()
      table.foreign('local_user').references('users.id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('local_user')
    })
  }
}
