#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CHECK_ONLY = process.argv.includes('--check-only')
const RUN = process.argv.includes('--run')
const CONFIRMED = process.argv.includes('--confirm-preview')

function readLocalDeployment() {
  try {
    const contents = readFileSync(resolve('.env.local'), 'utf8')
    const line = contents
      .split(/\r?\n/u)
      .find((candidate) => candidate.startsWith('CONVEX_DEPLOYMENT='))
    return line?.slice('CONVEX_DEPLOYMENT='.length).trim()
  } catch {
    return undefined
  }
}

function classifyDeployment(value) {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (
    process.env.VERCEL_ENV?.toLowerCase() === 'production' ||
    /^(?:prod|production)(?::|$)/u.test(normalized)
  ) {
    return 'production'
  }
  if (/^preview(?::|$)/u.test(normalized)) return 'preview'
  if (/^(?:dev|development)(?::|$)/u.test(normalized)) return 'development'
  return 'unknown'
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
}

const deployment =
  process.env.CONVEX_DEPLOYMENT ?? readLocalDeployment()
const deploymentClass = classifyDeployment(deployment)

// This guard intentionally runs before any subprocess or runtime probe.
if (deploymentClass === 'production') {
  fail('Production recusado antes de qualquer probe ou write.')
} else if (deploymentClass === 'unknown') {
  fail('Deployment não verificável; informe um deployment dev/Preview.')
} else if (CHECK_ONLY) {
  process.stdout.write(
    `${JSON.stringify({
      mode: 'check-only',
      deploymentClass,
      production: false,
      writesAttempted: 0,
      status: 'ready',
    })}\n`,
  )
} else if (!RUN || !CONFIRMED) {
  fail('Use --check-only ou --run --confirm-preview em ambiente isolado.')
} else {
  const probes = [
    ['readiness', 'adminTest:checkPhase8DeploymentReadiness'],
    ['scrypt', 'adminTest:smokePhase8Scrypt'],
    ['retention', 'adminTest:smokePhase8Retention'],
  ]
  const results = {}
  let failed = false

  for (const [label, functionName] of probes) {
    const startedAt = Date.now()
    const result = spawnSync(
      'npx',
      ['convex', 'run', functionName, '{}'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: process.env,
      },
    )
    if (result.status !== 0) {
      results[label] = {
        status: 'failed',
        durationMs: Date.now() - startedAt,
      }
      failed = true
      continue
    }
    let payload
    try {
      payload = JSON.parse(result.stdout)
    } catch {
      payload = { status: 'invalid-output' }
      failed = true
    }
    results[label] = {
      status: 'passed',
      durationMs: Date.now() - startedAt,
      result: payload,
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      mode: 'runtime',
      deploymentClass,
      production: false,
      status: failed ? 'failed' : 'passed',
      results,
    })}\n`,
  )
  if (failed) process.exitCode = 1
}
