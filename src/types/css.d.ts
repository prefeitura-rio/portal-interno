// TypeScript 6.0 enables `noUncheckedSideEffectImports` by default, which
// requires a module declaration for side-effect CSS imports (e.g. the
// `import './globals.css'` in src/app/layout.tsx). Next.js handles the CSS at
// build time; this declaration just satisfies the type checker.
declare module '*.css'
