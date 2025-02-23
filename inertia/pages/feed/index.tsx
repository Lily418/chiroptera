import { PageLayout } from '~/components/PageLayout'
import { PageTitle } from '~/components/Typography/PageTitle'
import { Subtitle } from '~/components/Typography/Subtitle'

export default function Home({ notes }: { notes: { content: string }[] }) {
  return (
    <PageLayout>
      <div className="max-w-prose flex flex-col gap-2 ">
        <PageTitle>Chiroptera</PageTitle>
        <p className="font-mono">
          Hello! I'm a little hobby project instance.
          <br />
          You can find my code on{' '}
          <a className="text-blue-500 underline" href=" https://github.com/Lily418/chiroptera">
            GitHub
          </a>
        </p>

        <Subtitle>Here are all the messages I've been sent:</Subtitle>
        <ul>
          {notes.map((note) => {
            return (
              <li
                dangerouslySetInnerHTML={{
                  __html: note.content,
                }}
              />
            )
          })}
        </ul>
      </div>
    </PageLayout>
  )
}
