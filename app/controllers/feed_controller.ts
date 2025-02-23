import Note from '#models/note'
import type { HttpContext } from '@adonisjs/core/http'

export default class FeedController {
  async getPublic({ inertia }: HttpContext) {
    const notes = await Note.all()
    return inertia.render('home', { notes })
  }

  async getAuthenticated({ inertia }: HttpContext) {
    const notes = await Note.all()
    return inertia.render('feed/index', { notes })
  }
}
