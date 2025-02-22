import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 2000)
      table.primary(['id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.text('content')
      table.string('attributed_to', 2000)
      table.foreign('attributed_to').references('actors.id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
