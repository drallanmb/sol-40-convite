import type { TestConvex } from 'convex-test'
import schema from './schema'

type WineTest = TestConvex<typeof schema>

type WineTestDependencies = {
  convexTest: (
    schemaDefinition: typeof schema,
    modules: Record<string, () => Promise<unknown>>,
  ) => WineTest
  modules: Record<string, () => Promise<unknown>>
}

/**
 * Mantém a descoberta Vite de módulos exclusiva em `*.test.ts`; este harness
 * segue carregável pelo runtime Convex sem APIs exclusivas do bundler de teste.
 */
export function makeWineTest({
  convexTest,
  modules,
}: WineTestDependencies) {
  return convexTest(schema, modules)
}
