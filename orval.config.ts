import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input:
      'https://raw.githubusercontent.com/prefeitura-rio/app-go-api/refs/heads/staging/docs/swagger.json',
    output: {
      target: './src/http-gorio/api.ts',
      schemas: './src/http-gorio/models',
      mode: 'tags-split',
      client: 'fetch',
      biome: true,
      httpClient: 'fetch',
      clean: true,
      baseUrl: process.env.NEXT_PUBLIC_COURSES_BASE_API_URL,
      override: {
        mutator: {
          path: './custom-fetch-gorio.ts',
          name: 'customFetchGoRio',
        },
      },
    },
  },
})
