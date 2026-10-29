import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Permite importar módulos .ts/.tsx de src/ (inclusive componentes do App
// Router) em Node puro: resolve o alias `@/` e os imports sem extensão do
// bundler do Next, transpila com o TypeScript do projeto e troca CSS e imagens
// por módulos vazios.
const SRC_ROOT = new URL('../../../', import.meta.url)
const ASSET_PATTERN = /\.(css|png|jpe?g|gif|svg|webp)$/
const SOURCE_EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

function findSourceFile(basePath: string): string | undefined {
  return SOURCE_EXTENSIONS.map(ext => `${basePath}${ext}`).find(
    candidate => existsSync(candidate) && statSync(candidate).isFile()
  )
}

export function registerSrcLoader(): void {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const parent = context.parentURL
      let basePath: string | undefined
      if (specifier.startsWith('@/')) {
        basePath = fileURLToPath(new URL(specifier.slice(2), SRC_ROOT))
      } else if (
        specifier.startsWith('.') &&
        parent?.startsWith(SRC_ROOT.href)
      ) {
        basePath = fileURLToPath(new URL(specifier, parent))
      }
      if (basePath) {
        const file = findSourceFile(basePath)
        if (file) return nextResolve(pathToFileURL(file).href, context)
      }
      try {
        return nextResolve(specifier, context)
      } catch (error) {
        // Subpaths sem `exports` (ex.: `next/navigation`) exigem a extensão em ESM
        if (/^[@a-z]/i.test(specifier) && !specifier.startsWith('node:')) {
          return nextResolve(`${specifier}.js`, context)
        }
        throw error
      }
    },
    load(url, context, nextLoad) {
      if (ASSET_PATTERN.test(url)) {
        return {
          format: 'module',
          source: 'export default { src: "" }',
          shortCircuit: true,
        }
      }
      if (url.startsWith(SRC_ROOT.href) && /\.tsx?$/.test(url)) {
        const { source } = nextLoad(url, { ...context, format: 'module' })
        const { outputText } = ts.transpileModule(String(source), {
          fileName: fileURLToPath(url),
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        })
        return { format: 'module', source: outputText, shortCircuit: true }
      }
      return nextLoad(url, context)
    },
  })
}
