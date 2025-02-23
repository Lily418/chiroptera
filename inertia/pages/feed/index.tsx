export default function Home({notes}: {notes: {content: string}[]}) {
    return <div className="flex flex-col items-center py-4 px-3">
        <div className="max-w-prose flex flex-col gap-2 ">
        <h1 className="text-3xl font-bold">Chiroptera</h1>
        <p className="font-mono">Hello! I'm a little hobby project instance.<br />You can find my code on <a className="text-blue-500 underline" href=" https://github.com/Lily418/chiroptera">GitHub</a></p>

        <h2 className="text-xl">Here are all the messages I've been sent:</h2>
        <ul>
            {notes.map((note) => {
                return <li dangerouslySetInnerHTML={{
                    __html: note.content
                }}/>
            })}
        </ul>
        </div>
    </div>
  }