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
      { cursor?: string },
      unknown
    >
  }
}).postInternal.retireTerminalReservations

const migrateLegacyTerminalReservations = (internal as unknown as {
  postInternal: {
    migrateLegacyTerminalReservations: FunctionReference<
      'mutation',
      'internal',
      {
        state?: 'accepted' | 'rejected' | 'expired'
        cursor?: string
      },
      unknown
    >
  }
}).postInternal.migrateLegacyTerminalReservations

const startExpiredRsvpSessionSweep = (internal as unknown as {
  rsvpInternal: {
    startExpiredRsvpSessionSweep: FunctionReference<
      'mutation',
      'internal',
      Record<string, never>,
      unknown
    >
  }
}).rsvpInternal.startExpiredRsvpSessionSweep

const crons = cronJobs()

crons.daily(
  'daily post storage sweep',
  { hourUTC: 3, minuteUTC: 15 },
  sweepOrphanStorage,
  {},
)

crons.daily(
  'daily legacy terminal reservation migration',
  { hourUTC: 3, minuteUTC: 25 },
  migrateLegacyTerminalReservations,
  {},
)

crons.daily(
  'daily terminal reservation retirement',
  { hourUTC: 3, minuteUTC: 30 },
  retireTerminalReservations,
  {},
)

crons.daily(
  'daily expired RSVP session sweep',
  { hourUTC: 3, minuteUTC: 35 },
  startExpiredRsvpSessionSweep,
  {},
)

export default crons
