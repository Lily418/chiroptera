import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 2000)
      table.primary(['id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
