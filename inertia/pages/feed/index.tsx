import vine from '@vinejs/vine'
import { Formik, FormikHelpers, FormikValues } from 'formik'
import { act, useState } from 'react'
import { PageLayout } from '~/components/PageLayout'
import { PageTitle } from '~/components/Typography/PageTitle'
import { Subtitle } from '~/components/Typography/Subtitle'
import { validateWithVine } from '~/util/formik_validate_with_vine'

export default function Home({ notes, actors }: { notes: { content: string, attributedTo: number }[], actors: Record<number, {url: string; preferred_username: string}> }) {
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

        <Subtitle>Here are all my messages</Subtitle>
        <ul>
          {notes.map((note) => {
            const actor = actors[note.attributedTo];
            return (
              <li>
                <a href={actor.url}>{actor.preferred_username}</a>
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
