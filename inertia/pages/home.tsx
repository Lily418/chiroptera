import { PageLayout } from '~/components/PageLayout'
import { H1 } from '~/components/Typography/h1'
import { H2 } from '~/components/Typography/H2'

export default function Home({ notes }: { notes: { content: string }[] }) {
  return (
    <PageLayout>
      <div className="max-w-prose flex flex-col gap-4">
        <H1>Chiroptera</H1>
        <div className='flex flex-col gap-2 bg-slate-100 p-2'>
        <p className="font-mono">
          Hello! I'm a tiny hobby project instance.
          <br />
          You can find my code on{' '}
          <a className="text-blue-500 underline" href=" https://github.com/Lily418/chiroptera">
            GitHub
          </a>
        </p>
        {/* <p className="font-mono">
        You can contact the administrator at <a className="text-blue-500 underline" href='mailto:chirp@chiroptera.space'>chirp@chiroptera.space</a>
        </p> */}
        </div>

        <div className='flex flex-col gap-1'>
          <p>This instance is currently invite only.</p>
        <a href='login' className='text-white bg-cyan-800 rounded py-2 text-xl text-center'>
          Login
        </a>
        </div>
      </div>
    </PageLayout>
  )
}
