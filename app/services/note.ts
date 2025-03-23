import Actor from '#models/actor'
import Note from '#models/note'

export const upsertNote = async (actor: Actor, note: any) => {
  const publicStream = 'https://www.w3.org/ns/activitystreams#Public'
  const isPublic = note.to === publicStream || (note.cc as string[]).includes(publicStream)

  const existingNote = await Note.findBy({
    external_id: note.id,
  })

  if (!existingNote) {
    await actor!.related('notes').create({
      external_id: note.id,
      content: note.content,
      isPublic: isPublic,
      object: note,
    })
  } else {
    existingNote.content = note.content
    existingNote.save()
  }
}
