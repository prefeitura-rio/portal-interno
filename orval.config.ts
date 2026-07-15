import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input:
      'https://raw.githubusercontent.com/prefeitura-rio/app-rmi/refs/heads/main/docs/swagger.json',
    output: {
      target: './src/http-rmi/api.ts',
      schemas: './src/http-rmi/models',
      mode: 'tags-split',
      client: 'fetch',
      formatter: 'biome',
      httpClient: 'fetch',
      clean: true,
      baseUrl: process.env.RMI_BASE_API_URL,
      override: {
        mutator: {
          path: './custom-fetch-rmi.ts',
          name: 'customFetchRmi',
        },
      },
    },
  },
})
