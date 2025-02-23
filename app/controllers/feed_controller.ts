import Note from '#models/note'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class FeedController {
  async getPublic({ inertia }: HttpContext) {
    const notes = await Note.all()
    return inertia.render('home', { notes })
  }

  async getAuthenticated({ inertia }: HttpContext) {
    const notes = await Note.findManyBy({
      isPublic: true,
    })
    return inertia.render('feed/index', { notes })
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
