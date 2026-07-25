import type { TestConvex } from 'convex-test'
import schema from './schema'

type PostTest = TestConvex<typeof schema>

type PostTestDependencies = {
  convexTest: (
    schemaDefinition: typeof schema,
    modules: Record<string, () => Promise<unknown>>,
  ) => PostTest
  modules: Record<string, () => Promise<unknown>>
  registerRateLimiter: (testInstance: PostTest) => void
}

/**
 * Mantém dependências exclusivas de teste fora dos módulos carregados pelo
 * runtime Convex. O arquivo `*.test.ts` injeta descoberta e adaptadores.
 */
export function makePostTest({
  convexTest,
  modules,
  registerRateLimiter,
}: PostTestDependencies) {
  const t = convexTest(schema, modules)
  registerRateLimiter(t)
  return t
}
