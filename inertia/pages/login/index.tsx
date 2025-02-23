import { Formik } from 'formik'
import vine from '@vinejs/vine'
import { PageLayout } from '~/components/PageLayout'
import { PageTitle } from '~/components/Typography/PageTitle'
import { useEffect, useState } from 'react'
import { validateWithVine } from '~/util/formik_validate_with_vine'

export default function Login(props: any) {
  const [serverError, setServerError] = useState(null as null | string)

  return (
    <PageLayout>
      <div className="flex flex-col gap-4 w-full max-w-80">
        <PageTitle>Login</PageTitle>
        <p className={`bg-red-700 text-white px-1 transition-[max-height] duration-700 ${serverError ? ' max-h-40' : 'max-h-0'}`}>{serverError ? serverError : '\u00A0'}</p>
        <Formik
          initialValues={{
            email: '',
            password: '',
          }}
          validate={async (values) => {
            return await validateWithVine(values, vine.compile(
              vine.object({
                email: vine.string().email().bail(false),
                password: vine.string().minLength(1).bail(false),
              })
            ))
          }}
          onSubmit={async (values) => {
            setServerError(null)
            const response = await fetch('/api/login', {
              method: 'POST',
              body: JSON.stringify({
                email: values.email,
                password: values.password,
              }),
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            })

            if (response.ok) {
              document.location.href = '/feed'
            } else {
              const json = await response.json()
              console.error(json)
              setServerError(json.errors[0].message)
            }
          }}
        >
          {({ handleSubmit, handleChange, isSubmitting, errors, touched, values }) => (
            <form className="flex flex-col gap-2 bg-slate-100 p-2 w-full" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1">
                email:
                <input
                  type="email"
                  className="bg-white"
                  name="email"
                  onChange={handleChange}
                  required
                  value={values.email}
                ></input>
                <span className="text-red-500" aria-live="polite">
                  {touched.email ? errors.email : ''}{' '}
                </span>
              </label>
              <label className="flex flex-col gap-1">
                password:
                <input
                  type="password"
                  className="bg-white"
                  name="password"
                  onChange={handleChange}
                  required
                  value={values.password}
                ></input>
                <span className="text-red-500" aria-live="polite">
                  {touched.password ? errors.password : ''}
                </span>
              </label>
              <button
                type="submit"
                className="text-white bg-cyan-800 rounded py-2 text-xl text-center my-2"
                disabled={isSubmitting}
              >
                Submit
              </button>
            </form>
          )}
        </Formik>
      </div>
    </PageLayout>
  )
}
