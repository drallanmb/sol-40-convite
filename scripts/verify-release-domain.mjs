import dns from 'node:dns/promises'
import tls from 'node:tls'
import { isIP } from 'node:net'

const APEX_HOST = 'sol40.com.br'
const WWW_HOST = 'www.sol40.com.br'
const EXPECTED_NAMESERVERS = [
  'ainsley.ns.cloudflare.com',
  'cody.ns.cloudflare.com',
]
const MAX_REDIRECTS = 3

function normalizeDnsName(value) {
  return value.trim().toLowerCase().replace(/\.$/u, '')
}

function normalizeSet(values, normalize = (value) => value) {
  return [...new Set(values.map(normalize))].sort()
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertEqualSets(actual, expected, label) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  assert(
    actualJson === expectedJson,
    `${label} mismatch: expected ${expectedJson}, received ${actualJson}`,
  )
}

async function resolveNonEmpty(label, operation) {
  let values
  try {
    values = await operation()
  } catch (error) {
    throw new Error(`${label} lookup failed: ${error.message}`, { cause: error })
  }
  assert(values.length > 0, `${label} lookup returned no answers`)
  return values
}

async function verifyDns(apexTarget, wwwTarget) {
  const nameservers = normalizeSet(
    await resolveNonEmpty('authoritative NS', () => dns.resolveNs(APEX_HOST)),
    normalizeDnsName,
  )
  assertEqualSets(
    nameservers,
    normalizeSet(EXPECTED_NAMESERVERS, normalizeDnsName),
    'authoritative NS',
  )

  const liveApexAddresses = normalizeSet(
    await resolveNonEmpty('live apex A', () => dns.resolve4(APEX_HOST)),
  )
  let apexTargetMode
  if (isIP(apexTarget) === 4) {
    assertEqualSets(
      liveApexAddresses,
      [apexTarget],
      'live apex A versus captured Vercel target',
    )
    apexTargetMode = 'strict-a'
  } else {
    assert(
      isIP(apexTarget) === 0,
      `VERCEL_APEX_TARGET must be an IPv4 address or DNS hostname: ${apexTarget}`,
    )
    const normalizedApexTarget = normalizeDnsName(apexTarget)
    await resolveNonEmpty('captured Vercel apex target A', () =>
      dns.resolve4(normalizedApexTarget),
    )
    try {
      const liveApexAliases = normalizeSet(
        await dns.resolveCname(APEX_HOST),
        normalizeDnsName,
      )
      assertEqualSets(
        liveApexAliases,
        [normalizedApexTarget],
        'live apex CNAME versus captured Vercel target',
      )
      apexTargetMode = 'strict-cname'
    } catch (error) {
      if (error?.code !== 'ENODATA' && error?.code !== 'ENOTFOUND') {
        throw error
      }
      // Cloudflare flattens an apex CNAME into A answers, so the public DNS
      // response cannot expose the configured CNAME value. The non-empty A
      // set above plus the live TLS/HTTP checks prove the flattened route;
      // the exact provider value remains an authenticated control-plane check.
      apexTargetMode = 'cloudflare-flattened-cname'
    }
  }

  const liveWwwAliases = normalizeSet(
    await resolveNonEmpty('live www CNAME', () => dns.resolveCname(WWW_HOST)),
    normalizeDnsName,
  )
  assertEqualSets(
    liveWwwAliases,
    [normalizeDnsName(wwwTarget)],
    'live www CNAME versus captured Vercel target',
  )

  return {
    nameservers,
    apexAddresses: liveApexAddresses,
    apexTargetMode,
    wwwAliases: liveWwwAliases,
  }
}

function verifyTls(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: true,
      },
      () => {
        const certificate = socket.getPeerCertificate()
        const authorized = socket.authorized
        const authorizationError = socket.authorizationError
        socket.end()

        if (!authorized || authorizationError) {
          reject(
            new Error(
              `TLS authorization failed for ${hostname}: ${
                authorizationError ?? 'unauthorized'
              }`,
            ),
          )
          return
        }
        if (!certificate?.subject) {
          reject(new Error(`TLS certificate identity missing for ${hostname}`))
          return
        }
        resolve({
          hostname,
          authorized: true,
          validTo: certificate.valid_to,
        })
      },
    )
    socket.setTimeout(10_000, () => {
      socket.destroy(new Error(`TLS timeout for ${hostname}`))
    })
    socket.on('error', reject)
  })
}

function normalizeProbePath(value) {
  const candidate = value.startsWith('/') ? value : `/${value}`
  const parsed = new URL(candidate, `https://${APEX_HOST}`)
  assert(
    parsed.origin === `https://${APEX_HOST}`,
    'RELEASE_PROBE_PATH must be a path/query, not another origin',
  )
  return `${parsed.pathname}${parsed.search}`
}

function assertPreservedPathAndQuery(actual, expected, label) {
  assert(
    actual.pathname === expected.pathname &&
      actual.search === expected.search,
    `${label} lost path/query: expected ${expected.pathname}${expected.search}, received ${actual.pathname}${actual.search}`,
  )
}

async function fetchManual(url) {
  let response
  try {
    response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    throw new Error(`HTTP request failed for ${url}: ${error.message}`, {
      cause: error,
    })
  }
  return response
}

async function verifyHttp(probePath) {
  const wwwUrl = new URL(probePath, `https://${WWW_HOST}`)
  const wwwResponse = await fetchManual(wwwUrl)
  assert(
    wwwResponse.status >= 200 && wwwResponse.status < 300,
    `www must return 2xx, received ${wwwResponse.status}`,
  )

  const apexUrl = new URL(probePath, `https://${APEX_HOST}`)
  const apexResponse = await fetchManual(apexUrl)
  assert(
    apexResponse.status === 301 || apexResponse.status === 308,
    `apex must return exactly 301 or 308, received ${apexResponse.status}`,
  )
  const location = apexResponse.headers.get('location')
  assert(location, 'apex permanent redirect is missing Location')
  const apexDestination = new URL(location)
  assert(
    apexDestination.protocol === 'https:' &&
      apexDestination.hostname === WWW_HOST,
    `apex Location must be absolute on https://${WWW_HOST}`,
  )
  assertPreservedPathAndQuery(
    apexDestination,
    apexUrl,
    'apex permanent redirect',
  )

  const visited = new Set()
  let current = apexUrl
  let hops = 0
  let finalStatus = null
  while (true) {
    const key = current.href
    assert(!visited.has(key), `redirect loop detected at ${key}`)
    visited.add(key)
    assert(
      current.protocol === 'https:' &&
        (current.hostname === APEX_HOST || current.hostname === WWW_HOST),
      `redirect chain reached unexpected origin ${current.origin}`,
    )
    assertPreservedPathAndQuery(current, apexUrl, 'redirect chain')

    const response = await fetchManual(current)
    if (response.status < 300 || response.status >= 400) {
      finalStatus = response.status
      break
    }

    hops += 1
    assert(hops <= MAX_REDIRECTS, `redirect chain exceeded ${MAX_REDIRECTS} hops`)
    const nextLocation = response.headers.get('location')
    assert(nextLocation, `redirect ${response.status} is missing Location`)
    current = new URL(nextLocation, current)
  }

  assert(current.hostname === WWW_HOST, `redirect chain ended on ${current.hostname}`)
  assert(
    finalStatus >= 200 && finalStatus < 300,
    `redirect chain final response must be 2xx, received ${finalStatus}`,
  )

  return {
    wwwStatus: wwwResponse.status,
    apexStatus: apexResponse.status,
    location: apexDestination.href,
    hops,
    finalStatus,
  }
}

async function main() {
  const apexTarget = requireEnv('VERCEL_APEX_TARGET')
  const wwwTarget = requireEnv('VERCEL_WWW_TARGET')
  const dnsResolver = process.env.DNS_RESOLVER?.trim()
  if (dnsResolver) {
    assert(
      isIP(dnsResolver) !== 0,
      `DNS_RESOLVER must be an IPv4 or IPv6 address: ${dnsResolver}`,
    )
    dns.setServers([dnsResolver])
  }
  const probePath = normalizeProbePath(
    process.env.RELEASE_PROBE_PATH?.trim() || '/confirmar?origem=smoke',
  )

  const dnsResult = await verifyDns(apexTarget, wwwTarget)
  const tlsResult = await Promise.all([
    verifyTls(APEX_HOST),
    verifyTls(WWW_HOST),
  ])
  const httpResult = await verifyHttp(probePath)

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        probePath,
        dnsResolver: dnsResolver || 'system',
        dns: dnsResult,
        tls: tlsResult,
        http: httpResult,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(`release domain verification failed: ${error.message}`)
  process.exitCode = 1
})
