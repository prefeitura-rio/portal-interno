import { defineConfig } from 'orval'

export default defineConfig({
   api: {
    input:
      'https://raw.githubusercontent.com/prefeitura-rio/app-rmi/refs/heads/staging/docs/openapi-v3.json',
    output: {
      target: './src/http-rmi/api.ts',
      schemas: './src/http-rmi/models',
      mode: 'tags-split',
      client: 'fetch',
      biome: true,
      httpClient: 'fetch',
      clean: true,
      baseUrl: process.env.NEXT_PUBLIC_RMI_BASE_API_URL,
      override: {
        mutator: {
          path: './custom-fetch-rmi.ts',
          name: 'customFetchRmi',
        },
      },
    },
  },

})
