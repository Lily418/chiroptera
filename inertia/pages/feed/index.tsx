import { PageLayout } from '~/components/PageLayout'
import { H1 } from '~/components/Typography/h1'
import { H2 } from '~/components/Typography/H2'

export default function Home({ notes }: { notes: { content: string }[] }) {
  return (
    <PageLayout>
      <div className="max-w-prose flex flex-col gap-2 ">
        <H1>Chiroptera</H1>
        <p className="font-mono">
          Hello! I'm a little hobby project instance.
          <br />
          You can find my code on{' '}
          <a className="text-blue-500 underline" href=" https://github.com/Lily418/chiroptera">
            GitHub
          </a>
        </p>

        <H2>Here are all the messages I've been sent:</H2>
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
