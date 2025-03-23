import Actor from '#models/actor'
import Note from '#models/note'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class FeedController {
  async getPublic({ inertia }: HttpContext) {
    return inertia.render('home')
  }

  async getAuthenticated({ inertia, auth }: HttpContext) {
    const notes = await Note.query().whereIn(
      'attributed_to',
      db.from('followings').select('following').where('follower', '=', auth.user!.id)
    )

    const actors: Record<number, any> = {}
    await Promise.all(
      notes.map(async (note) => {
        if (!actors[note.attributedTo]) {
          const actor = await Actor.find(note.attributedTo)
          actors[note.attributedTo] = actor
        }
      })
    )

    return inertia.render('feed/index', { notes, actors })
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
}
