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

const retireTerminalReservations = (internal as unknown as {
  postInternal: {
    retireTerminalReservations: FunctionReference<
      'mutation',
      'internal',
      Record<string, never>,
      unknown
    >
  }
}).postInternal.retireTerminalReservations

const crons = cronJobs()

crons.daily(
  'daily post storage sweep',
  { hourUTC: 3, minuteUTC: 15 },
  sweepOrphanStorage,
  {},
)

crons.daily(
  'daily terminal reservation retirement',
  { hourUTC: 3, minuteUTC: 30 },
  retireTerminalReservations,
  {},
)

export default crons
