### Metodologia para gerar novos http clients com orval:

- No arquivo **orval.config.ts, trocar esses campos de acordo com a api:**
- **input**
- **target**
- **schema**
- **path**
- **baseUrl**
- **name**
- 

> ### app-busca-search

> ### https://services.staging.app.dados.rio/app-busca-search/swagger/index.html#/

* https://raw.githubusercontent.com/prefeitura-rio/app-busca-search/refs/heads/staging/docs/openapi-v3.json

```
api: {
    input:
      'https://raw.githubusercontent.com/prefeitura-rio/app-busca-search/refs/heads/staging/docs/openapi-v3.json',
    output: {
      target: './src/http-busca-search/api.ts',
      schemas: './src/http-busca-search/models',
      mode: 'tags-split',
      client: 'fetch',
      biome: true,
      httpClient: 'fetch',
      clean: true,
      baseUrl: process.env.NEXT_PUBLIC_BUSCA_SEARCH_API_URL,
      override: {
        mutator: {
          path: './custom-fetch-busca-search.ts',
          name: 'customFetchBuscaSearch',
        },
      },
    },
  },
```

> ### app-go-api

* https://raw.githubusercontent.com/prefeitura-rio/app-go-api/refs/heads/staging/docs/swagger.json

```
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

```
