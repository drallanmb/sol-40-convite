import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../convex/_generated/api'
import { MEMORIES_COPY } from '../../content/event'
import Card from '../ui/Card'

export type PublicMemory = FunctionReturnType<
  typeof api.posts.listApproved
>[number]

export type MemoryCardProps = {
  memory: PublicMemory
}

export function MemoryCard({ memory }: MemoryCardProps) {
  const hasImage = memory.imageUrl !== undefined

  return (
    <Card className="flex h-full min-h-[34rem] flex-col overflow-hidden p-0! sm:p-0!">
      {hasImage ? (
        <div className="grid h-[20rem] shrink-0 place-items-center bg-sand/55">
          <img
            src={memory.imageUrl}
            alt={MEMORIES_COPY.card.imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        </div>
      ) : null}

      <div
        className={`flex min-h-0 flex-1 flex-col gap-5 p-6 sm:p-8 ${
          hasImage ? 'justify-between' : 'items-center justify-center text-center'
        }`}
      >
        {memory.message ? (
          <p
            className={`whitespace-pre-wrap break-words font-serif leading-snug text-plum ${
              hasImage ? 'text-lead' : 'max-w-[24ch] text-subheading'
            }`}
          >
            {memory.message}
          </p>
        ) : (
          <p className="font-serif text-lead italic text-plum/70">
            {MEMORIES_COPY.card.imageOnly}
          </p>
        )}

        <p className="break-words text-small font-bold uppercase tracking-label text-wine">
          {memory.author}
        </p>
      </div>
    </Card>
  )
}

export default MemoryCard
