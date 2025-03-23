import { PageLayout } from '~/components/PageLayout'
import { PageTitle } from '~/components/Typography/PageTitle'
import { Subtitle } from '~/components/Typography/Subtitle'

export default function Home({
  notes,
  actor,
}: {
  notes: { id: number; content: string; attributedTo: number; createdAt: string }[]
  actor: { url: string; preferredUsername: string }
}) {
  const urlAsURL = new URL(actor.url)
  return (
    <PageLayout>
      <div className="w-full flex flex-col gap-2 ">
        <PageTitle>
          {actor.preferredUsername}@{urlAsURL.hostname}
        </PageTitle>
        <a href={actor.url} className="text-blue-500 underline">
          {actor.url}
        </a>
        <Subtitle>Notes</Subtitle>
        <ul>
          {notes.map((note) => {
            return (
              <li key={note.id}>
                <p className="italic text-xs">
                  {new Date(note.createdAt).toLocaleString(undefined, {
                    weekday: undefined,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: note.content,
                  }}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </PageLayout>
  )
}
