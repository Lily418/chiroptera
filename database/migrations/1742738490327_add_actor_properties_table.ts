import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actors'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('external_id')
      table.text('inbox')
      table.text('outbox')
      table.text('preferredUsername')
      table.text('url')
      table.json('object')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('external_id')
      table.dropColumn('inbox')
      table.dropColumn('outbox')
      table.dropColumn('preferredUsername')
      table.dropColumn('url')
      table.dropColumn('object')
    })
  }
}
