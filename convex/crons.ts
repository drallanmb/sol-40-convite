import { cronJobs, type FunctionReference } from 'convex/server'
import { internal } from './_generated/api'

const sweepOrphanStorage = (internal as unknown as {
  postInternal: {
    sweepOrphanStorage: FunctionReference<
      'mutation',
      'internal',
      { cursor?: string },
      unknown
    >
  }
}).postInternal.sweepOrphanStorage

const crons = cronJobs()

crons.daily(
  'daily post storage sweep',
  { hourUTC: 3, minuteUTC: 15 },
  sweepOrphanStorage,
  {},
)

export default crons
