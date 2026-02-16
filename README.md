This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔍 Biome scripts

```bash
# Format all files
npx @biomejs/biome format --write

# Format specific files
npx @biomejs/biome format --write <files>

# Lint files and apply safe fixes to all files
npx @biomejs/biome lint --write

# Lint files and apply safe fixes to specific files
npx @biomejs/biome lint --write <files>

# Format, lint, and organize imports of all files
npx @biomejs/biome check --write

# Format, lint, and organize imports of specific files
npx @biomejs/biome check --write <files>
```
