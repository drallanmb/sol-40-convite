import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_MANIFEST = join(ROOT, 'public/wines/manifest.json')
const DEFAULT_PUBLIC_DIR = join(ROOT, 'public')
const CATALOG_PATH = join(ROOT, 'convex/wineCatalog.ts')
const EXPECTED_ASSET_COUNT = 37
const EXPECTED_CONSTRAINTS = {
  width: 720,
  height: 960,
  maxBytes: 300 * 1024,
  alpha: true,
}

class AuditFailure extends Error {}

function fail(message) {
  throw new AuditFailure(message)
}

function parseOptions(argv) {
  const options = {
    preflight: false,
    manifestPath: DEFAULT_MANIFEST,
    publicDir: DEFAULT_PUBLIC_DIR,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--preflight') {
      options.preflight = true
    } else if (argument === '--manifest' || argument === '--public-dir') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        fail(`${argument} exige um caminho.`)
      }
      if (argument === '--manifest') options.manifestPath = resolve(value)
      if (argument === '--public-dir') options.publicDir = resolve(value)
      index += 1
    } else {
      fail(`Opção desconhecida: ${argument}`)
    }
  }

  return options
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    fail(`Manifest inválido em ${path}: ${error.message}`)
  }
}

async function readCanonicalAssets() {
  const source = await readFile(CATALOG_PATH, 'utf8')
  const records = [
    ...source.matchAll(
      /\{\s*productCode:\s*'([^']+)'[\s\S]*?imageUrl:\s*'([^']+)'\s*\}/gu,
    ),
  ].map((match) => ({ productCode: match[1], path: match[2] }))

  if (records.length !== EXPECTED_ASSET_COUNT) {
    fail(
      `Catálogo canônico contém ${records.length} registros; esperado ${EXPECTED_ASSET_COUNT}.`,
    )
  }

  return records
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} deve ser um objeto.`)
  }
}

function assertUnique(values, label) {
  const seen = new Set()
  for (const value of values) {
    if (seen.has(value)) fail(`${label} duplicado: ${value}`)
    seen.add(value)
  }
}

function validateStructure(manifest, canonicalAssets) {
  assertPlainObject(manifest, 'Manifest')

  if (manifest.version !== 1) fail('Manifest version deve ser 1.')
  assertPlainObject(manifest.constraints, 'constraints')

  for (const [key, expected] of Object.entries(EXPECTED_CONSTRAINTS)) {
    if (manifest.constraints[key] !== expected) {
      fail(`constraints.${key} deve ser ${String(expected)}.`)
    }
  }

  if (!Array.isArray(manifest.assets)) fail('assets deve ser uma lista.')
  if (manifest.assets.length !== EXPECTED_ASSET_COUNT) {
    fail(
      `Manifest contém ${manifest.assets.length} slots; esperado ${EXPECTED_ASSET_COUNT}.`,
    )
  }

  for (const [index, asset] of manifest.assets.entries()) {
    assertPlainObject(asset, `assets[${index}]`)
    if (!/^\d{1,32}$/u.test(asset.productCode ?? '')) {
      fail(`assets[${index}].productCode deve conter apenas dígitos.`)
    }
    if (
      !/^\/wines\/[a-z0-9][a-z0-9-]*\.(?:png|webp)$/u.test(asset.path ?? '')
    ) {
      fail(`assets[${index}].path não é um caminho local PNG/WebP aprovado.`)
    }
    if (asset.status !== 'pending' && asset.status !== 'approved') {
      fail(`assets[${index}].status deve ser pending ou approved.`)
    }
  }

  assertUnique(
    manifest.assets.map((asset) => asset.productCode),
    'Código de produto',
  )
  assertUnique(
    manifest.assets.map((asset) => asset.path),
    'Caminho de asset',
  )

  const manifestByCode = new Map(
    manifest.assets.map((asset) => [asset.productCode, asset.path]),
  )
  for (const canonical of canonicalAssets) {
    if (manifestByCode.get(canonical.productCode) !== canonical.path) {
      fail(
        `Mapeamento divergente para ${canonical.productCode}: esperado ${canonical.path}.`,
      )
    }
  }
}

function validateProvenance(asset) {
  if (asset.status !== 'approved') {
    fail(`${asset.productCode}: status pending não pode passar no modo estrito.`)
  }

  assertPlainObject(asset.provenance, `${asset.productCode}.provenance`)
  const { provenance } = asset

  for (const field of ['source', 'contact', 'permissionDate']) {
    if (
      typeof provenance[field] !== 'string' ||
      provenance[field].trim().length === 0
    ) {
      fail(`${asset.productCode}: provenance.${field} é obrigatório.`)
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(provenance.permissionDate)) {
    fail(`${asset.productCode}: permissionDate deve usar YYYY-MM-DD.`)
  }
  if (provenance.localHostingApproved !== true) {
    fail(`${asset.productCode}: hospedagem local precisa estar aprovada.`)
  }
  if (provenance.productIdentityConfirmed !== true) {
    fail(`${asset.productCode}: identidade do rótulo precisa estar confirmada.`)
  }
  if (
    !Array.isArray(provenance.allowedTransformations) ||
    provenance.allowedTransformations.length === 0 ||
    provenance.allowedTransformations.some(
      (value) => typeof value !== 'string' || value.trim().length === 0,
    )
  ) {
    fail(
      `${asset.productCode}: allowedTransformations deve registrar permissões explícitas.`,
    )
  }
}

function readPngMetadata(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (
    buffer.length < 33 ||
    !buffer.subarray(0, signature.length).equals(signature) ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    fail('PNG inválido ou sem IHDR.')
  }

  const colorType = buffer[25]
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6,
  }
}

function readWebpMetadata(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    fail('WebP inválido.')
  }

  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
      hasAlpha: (buffer[20] & 0x10) !== 0,
    }
  }

  if (chunk === 'VP8L' && buffer[20] === 0x2f) {
    const byte1 = buffer[21]
    const byte2 = buffer[22]
    const byte3 = buffer[23]
    const byte4 = buffer[24]
    return {
      width: 1 + byte1 + ((byte2 & 0x3f) << 8),
      height: 1 + (byte2 >> 6) + (byte3 << 2) + ((byte4 & 0x0f) << 10),
      hasAlpha: (byte4 & 0x10) !== 0,
    }
  }

  fail('WebP precisa usar VP8X ou VP8L com metadados de alpha verificáveis.')
}

function readImageMetadata(path, buffer) {
  const extension = extname(path).toLowerCase()
  if (extension === '.png') return readPngMetadata(buffer)
  if (extension === '.webp') return readWebpMetadata(buffer)
  fail(`Formato não auditável: ${extension || '(sem extensão)'}.`)
}

function resolvePublicAsset(publicDir, publicPath) {
  const relativePath = publicPath.slice(1)
  const resolvedPath = resolve(publicDir, relativePath)
  const publicRoot = `${resolve(publicDir)}/`

  if (!resolvedPath.startsWith(publicRoot)) {
    fail(`Caminho escapa do diretório público: ${publicPath}`)
  }

  return resolvedPath
}

async function validateBinary(asset, constraints, publicDir) {
  const filePath = resolvePublicAsset(publicDir, asset.path)
  let fileStat
  let buffer

  try {
    ;[fileStat, buffer] = await Promise.all([stat(filePath), readFile(filePath)])
  } catch {
    fail(`${asset.productCode}: arquivo ausente em ${asset.path}.`)
  }

  if (!fileStat.isFile() || fileStat.size === 0) {
    fail(`${asset.productCode}: asset deve ser um arquivo não vazio.`)
  }
  if (fileStat.size > constraints.maxBytes) {
    fail(
      `${asset.productCode}: ${fileStat.size} bytes excedem ${constraints.maxBytes}.`,
    )
  }

  const metadata = readImageMetadata(asset.path, buffer)
  if (
    metadata.width !== constraints.width ||
    metadata.height !== constraints.height
  ) {
    fail(
      `${asset.productCode}: dimensão ${metadata.width}x${metadata.height}; esperado ${constraints.width}x${constraints.height}.`,
    )
  }
  if (constraints.alpha && !metadata.hasAlpha) {
    fail(`${asset.productCode}: imagem não possui canal alpha.`)
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const [manifest, canonicalAssets] = await Promise.all([
    readJson(options.manifestPath),
    readCanonicalAssets(),
  ])

  validateStructure(manifest, canonicalAssets)

  const pendingCount = manifest.assets.filter(
    (asset) => asset.status === 'pending',
  ).length

  if (options.preflight) {
    console.log(
      `PASS preflight: ${manifest.assets.length} códigos e caminhos únicos; ${pendingCount} assets pending.`,
    )
    return
  }

  for (const asset of manifest.assets) {
    validateProvenance(asset)
    await validateBinary(asset, manifest.constraints, options.publicDir)
  }

  console.log(
    `PASS strict: ${manifest.assets.length} assets aprovados, auditados e prontos.`,
  )
}

main().catch((error) => {
  const prefix = error instanceof AuditFailure ? 'FAIL' : 'ERROR'
  console.error(`${prefix} wine-assets: ${error.message}`)
  process.exitCode = 1
})
