import vine from '@vinejs/vine'
import { Formik } from 'formik'
import { PageLayout } from '~/components/PageLayout'
import { PageTitle } from '~/components/Typography/PageTitle'
import { Subtitle } from '~/components/Typography/Subtitle'
import { validateWithVine } from '~/util/formik_validate_with_vine'

export default function Home({
  notes,
  actors,
  user,
}: {
  notes: { id: number; content: string; attributedTo: number }[]
  actors: Record<number, { url: string; preferredUsername: string; id: number }>
  user: { displayName: string; following: { id: number; url: string; preferredUsername: string }[] }
}) {
  return (
    <PageLayout>
      <div className="w-full flex flex-col gap-2 ">
        <PageTitle>Chiroptera</PageTitle>

        <div className="w-full">
          <div className="bg-slate-100 p-2 w-full">
            <Formik
              initialValues={{ query: '' }}
              onSubmit={(values) => {
                document.location.href = `/searchResults?q=${values.query}`
              }}
              validate={async (values) => {
                return await validateWithVine(
                  values,
                  vine.compile(
                    vine.object({
                      query: vine.string().minLength(1).bail(false),
                    })
                  )
                )
              }}
            >
              {({ handleChange, handleSubmit, values }) => (
                <form onSubmit={handleSubmit} className="flex flex-row gap-2 items-center">
                  <input
                    name="query"
                    type="text"
                    className="bg-white w-full h-[2rem]"
                    value={values.query}
                    onChange={handleChange}
                  ></input>
                  <button type="submit" className="text-white bg-cyan-800 rounded p-1 text-center">
                    Search
                  </button>
                </form>
              )}
            </Formik>
          </div>
        </div>
        <div className="bg-sky-100 my-4 p-2 flex flex-col gap-2">
          <Formik
            initialValues={{ content: '' }}
            onSubmit={(values) => {}}
            validate={async (values) => {
              return await validateWithVine(
                values,
                vine.compile(
                  vine.object({
                    content: vine.string().minLength(1).bail(false),
                  })
                )
              )
            }}
          >
            {({ handleChange, handleSubmit, values }) => (
              <form onSubmit={handleSubmit}>
                <Subtitle>Posting as {user.displayName}</Subtitle>
                <textarea
                  className="bg-white w-full h-[6rem]"
                  onChange={handleChange}
                  value={values.content}
                />
                <button
                  type="submit"
                  className="text-white bg-cyan-800 rounded p-1 text-center lowercase"
                >
                  Chirp
                </button>
              </form>
            )}
          </Formik>
        </div>

        <Subtitle>Here are all my messages</Subtitle>
        <ul>
          {notes.map((note) => {
            const actor = actors[note.attributedTo]
            return (
              <li key={note.id}>
                <a href={`/profile/${actor.id}`} className="text-blue-500 underline">
                  {actor.preferredUsername}
                </a>
                <div
                  dangerouslySetInnerHTML={{
                    __html: note.content,
                  }}
                />
              </li>
            )
          })}
        </ul>

        <Subtitle>Following</Subtitle>

        {user.following.map((follow) => {
          return (
            <li key={follow.id}>
              <a href={`/profile/${follow.id}`} className="text-blue-500 underline">
                {follow.preferredUsername}
              </a>
            </li>
          )
        })}
      </div>
    </PageLayout>
  )
}
