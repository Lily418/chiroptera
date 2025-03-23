import { PageLayout } from '~/components/PageLayout'
import { PageTitle } from '~/components/Typography/PageTitle'

export default function SearchResults({
  accounts,
}: {
  accounts: { acct: string; displayName: string; uri: string; avatar: string }[]
}) {
  return (
    <PageLayout>
      <PageTitle>Search Results</PageTitle>
      <div className="w-full py-2">
        {accounts.map((account) => {
          return (
            <div className="flex flex-row justify-between w-full">
              <div className="flex flex-row items-center gap-2 flex-1">
                <img src={account.avatar} className="h-[40px]" />
                <div className="flex flex-col flex-1 max-w-[70%]">
                  <p>{account.displayName}</p>
                  <p className="font-mono truncate flex-1">{account.acct}</p>
                </div>
              </div>
              <div>
                <button
                  className="text-white bg-cyan-800 rounded p-1 text-center my-2 w-full"
                  onClick={() => {
                    fetch(`/api/actor/${encodeURIComponent(account.uri)}/follow`, {
                      method: "POST"
                    })
                  }}
                >
                  Follow
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
