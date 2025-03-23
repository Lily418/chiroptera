import Actor from '#models/actor'
import Following from '#models/following'
import Note from '#models/note'
import User from '#models/user'
import { fetchOutbox } from '#services/actor'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'

export default class FeedController {
  async getPublic({ inertia }: HttpContext) {
    return inertia.render('home')
  }

  async getAuthenticated({ inertia, auth }: HttpContext) {
    const authedActor = await Actor.findBy({ local_user: auth.user!.id })

    logger.info(Following.query().where('follower', '=', auth.user!.id), 'followings')

    const notes = await Note.query()
      .whereIn(
        'attributed_to',
        db.from('followings').select('following').where('follower', '=', auth.user!.id)
      )
      .orWhere('attributed_to', authedActor!.id)

    const user = await User.query()
      .where({ id: auth.user!.id })
      .preload('actor', (actorQuery) => {
        actorQuery.preload('following')
      })
      .first()

    const actors: Record<number, any> = {}
    await Promise.all(
      notes.map(async (note) => {
        if (!actors[note.attributedTo]) {
          const actor = await Actor.find(note.attributedTo)
          actors[note.attributedTo] = actor
        }
      })
    )

    return inertia.render('feed/index', { notes, actors, user })
  }

  async searchResults({ inertia, request }: HttpContext) {
    const query = request.qs().q

    let accounts: { acct: string; displayName: string; uri: string; avatar: string }[] = []
    // const localReponse = await User.query().whereLike('username', `%${query}%`)
    const externalApi = 'https://mastodon.social'
    const externalResponse = await fetch(`${externalApi}/api/v2/search?q=${query}&type=accounts`, {
      headers: {
        Accept: 'application/activity+json',
      },
    })

    const externalResponseJson: any = await externalResponse.json()
    const externalAccounts = externalResponseJson.accounts
      .filter((account: any) => {
        return account.discoverable
      })
      .map((account: any) => {
        return {
          acct: (account.uri as string).startsWith(externalApi)
            ? `${account.acct}@${new URL(externalApi).host}`
            : account.acct,
          displayName: account.display_name,
          uri: account.uri,
          avatar: account.avatar,
        }
      })

    // We should retrieve local accounts and concat them here
    accounts = externalAccounts

    // logger.info({ externalResponseJson: externalResponseJson }, 'externalResponseJson')

    return inertia.render('feed/search_results', {
      accounts,
    })
  }

  async profileFeed({ inertia, request, auth }: HttpContext) {
    const actorId = request.param('actorId')
    const actor = await Actor.find(actorId)
    await fetchOutbox({ actorId: actor!.id, userId: auth.user!.id })
    const notes = await Note.findManyBy({ attributedTo: actorId })
    return inertia.render('feed/profile', {
      actor,
      notes,
    })
  }
}
