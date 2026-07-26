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

const startExpiredAuditEventsSweep = (internal as unknown as {
  adminInternal: {
    startExpiredAuditEventsSweep: FunctionReference<
      'mutation',
      'internal',
      Record<string, never>,
      unknown
    >
  }
}).adminInternal.startExpiredAuditEventsSweep

const startExpiredAccessLinksSweep = (internal as unknown as {
  adminInternal: {
    startExpiredAccessLinksSweep: FunctionReference<
      'mutation',
      'internal',
      Record<string, never>,
      unknown
    >
  }
}).adminInternal.startExpiredAccessLinksSweep

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

crons.daily(
  'daily expired admin audit sweep',
  { hourUTC: 3, minuteUTC: 45 },
  startExpiredAuditEventsSweep,
  {},
)

crons.daily(
  'daily expired admin access link sweep',
  { hourUTC: 3, minuteUTC: 40 },
  startExpiredAccessLinksSweep,
  {},
)

export default crons
