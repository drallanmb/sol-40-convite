import type { TestConvex } from 'convex-test'
import schema from './schema'

type RsvpTest = TestConvex<typeof schema>

type RsvpTestDependencies = {
  convexTest: (
    schemaDefinition: typeof schema,
    modules: Record<string, () => Promise<unknown>>,
  ) => RsvpTest
  modules: Record<string, () => Promise<unknown>>
  registerRateLimiter: (testInstance: RsvpTest) => void
}

/**
 * O arquivo é carregável pelo runtime Convex; dependências exclusivas de teste
 * chegam por injeção a partir de `*.test.ts`, que o deploy ignora.
 */
export function makeRsvpTest({
  convexTest,
  modules,
  registerRateLimiter,
}: RsvpTestDependencies) {
  const t = convexTest(schema, modules)
  registerRateLimiter(t)
  return t
}
