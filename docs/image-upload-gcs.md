# Upload de Imagens via Google Cloud Storage (Signed URLs)

## Visão Geral

Esta feature implementa upload seguro de imagens diretamente para o Google Cloud Storage (GCS) sem que os arquivos passem pelo servidor Next.js. O padrão utilizado é chamado de **presigned/signed URL** — o servidor gera uma URL temporária e assinada criptograficamente que autoriza o browser a fazer o upload diretamente para o bucket GCS.

**Arquivos envolvidos:**

- `[src/app/api/upload/signed-url/route.ts](../src/app/api/upload/signed-url/route.ts)` — API Route que gera a Signed URL
- `[src/components/ui/image-upload.tsx](../src/components/ui/image-upload.tsx)` — Componente de upload reutilizável
- `[src/components/ui/image-crop-dialog.tsx](../src/components/ui/image-crop-dialog.tsx)` — Dialog de recorte de imagem
- Uso: `new-course-form.tsx` nos campos `institutional_logo`, `cover_image` e `external_partner_logo_url`

**Dependências adicionadas:**

- `@google-cloud/storage` ^7.21.0 — SDK oficial do GCS para geração de Signed URLs
- `react-easy-crop` ^6.0.2 — Componente de recorte de imagem no browser

---

## Fluxo Completo de Upload

```mermaid
sequenceDiagram
    actor Usuário
    participant Browser as Browser (React)
    participant Next as Next.js Server<br/>/api/upload/signed-url
    participant GCS as Google Cloud Storage

    Usuário->>Browser: Seleciona/arrasta imagem
    Browser->>Browser: Valida tipo e tamanho (client-side)
    
    alt cropAspectRatio definido
        Browser->>Browser: Abre ImageCropDialog
        Usuário->>Browser: Ajusta o recorte e confirma
        Browser->>Browser: Canvas API extrai área recortada como Blob
    end

    Browser->>Next: POST /api/upload/signed-url<br/>{ contentType: "image/png" }
    Note over Next: Valida JWT cookie (access_token)<br/>Valida contentType no allowlist<br/>Gera UUID para nome do arquivo
    Next->>GCS: Solicita Signed URL (v4, write, 15min)<br/>com x-goog-acl: public-read
    GCS-->>Next: Signed URL temporária
    Next-->>Browser: { signedUrl, publicUrl }

    Browser->>GCS: OPTIONS (CORS preflight)<br/>com Signed URL
    GCS-->>Browser: 200 OK — CORS permitido

    Browser->>GCS: PUT <signed-url><br/>headers: content-type, x-goog-acl: public-read<br/>body: Blob da imagem
    GCS-->>Browser: 200 OK — objeto criado

    Browser->>Browser: onChange(publicUrl) — atualiza campo do formulário
    Browser->>GCS: GET <publicUrl> (preview da imagem)
    GCS-->>Browser: Imagem (cache-control: public, max-age=3600)
```



---

## Anatomia das Requisições de Rede

O upload gera **4 requisições** em sequência:

### 1. POST `/api/upload/signed-url` (Next.js — same-origin)

```
URL:    root/api/upload/signed-url
Método: POST
Body:   { "contentType": "image/png" }
Auth:   Cookie: access_token=<JWT>
```

Resposta:

```json
{
  "signedUrl": "https://storage.googleapis.com/rj-superapp-staging-prefrio/superapp/images/courses/<uuid>.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...&X-Goog-Date=...&X-Goog-Expires=900&X-Goog-SignedHeaders=content-type%3Bhost%3Bx-goog-acl&X-Goog-Signature=...",
  "publicUrl": "https://storage.googleapis.com/rj-superapp-staging-prefrio/superapp/images/courses/<uuid>.png"
}
```

> `X-Goog-Expires=900` = 900 segundos = **15 minutos** de validade.

### 2. OPTIONS (CORS Preflight — cross-site)

O browser envia o preflight automaticamente antes de qualquer PUT cross-origin:

```
URL:    https://storage.googleapis.com/...<signed-url>
Método: OPTIONS
Access-Control-Request-Method:  PUT
Access-Control-Request-Headers: content-type, x-goog-acl
```

Resposta do GCS:

```
access-control-allow-origin:  http://localhost:3000
access-control-allow-methods: PUT
access-control-allow-headers: Content-Type, x-goog-acl
access-control-max-age:       3600
```

### 3. PUT (upload direto para o GCS — cross-site)

```
URL:    https://storage.googleapis.com/...<signed-url>
Método: PUT
Headers:
  Content-Type: image/png
  x-goog-acl:   public-read
Body:   <Blob da imagem, 1.013.322 bytes>
```

Resposta:

```
Status: 200 OK
ETag:   "59f7b5c3e01c5c9a9d6def8b615bb63c"
x-goog-generation: 1781293506922524
```

> O header `x-goog-acl: public-read` está incluído em `X-Goog-SignedHeaders`, o que significa que o GCS **verifica** que o browser deve enviar exatamente esse header — qualquer alteração invalida a assinatura.

### 4. GET (preview da imagem — cross-site)

```
URL:    https://storage.googleapis.com/rj-superapp-staging-prefrio/superapp/images/courses/<uuid>.png
Método: GET
```

Resposta:

```
Status: 200 OK
cache-control: public, max-age=3600
content-type:  image/png
```

---

## Arquitetura de Segurança

```mermaid
graph TD
    subgraph "Browser (Não confiável)"
        A[Usuário seleciona imagem]
        B[Validação client-side<br/>tipo + tamanho]
        C[POST /api/upload/signed-url]
        D[PUT direto no GCS]
    end

    subgraph "Next.js Server (Confiável)"
        E{JWT válido?}
        F{ContentType<br/>no allowlist?}
        G[Gera UUID v4<br/>para o path]
        H[GCS SDK gera<br/>Signed URL]
    end

    subgraph "Google Cloud Storage"
        I{Assinatura<br/>válida?}
        J{Expirou?<br/>15 min}
        K{Headers conferem<br/>com assinatura?}
        L[Objeto salvo<br/>com ACL public-read]
    end

    subgraph "Credenciais (Nunca expostas)"
        M[GCS_PRIVATE_KEY<br/>GCS_CLIENT_EMAIL<br/>GCS_BUCKET_NAME]
    end

    A --> B --> C
    C --> E
    E -- Não --> N[401 Não autenticado]
    E -- Sim --> F
    F -- Não --> O[400 Tipo não permitido]
    F -- Sim --> G --> H
    M -.->|env vars server-side| H
    H --> P[signedUrl + publicUrl]
    P --> D
    D --> I
    I -- Inválida --> Q[403 Forbidden]
    I -- Válida --> J
    J -- Expirou --> R[403 Expired]
    J -- Válida --> K
    K -- Diverge --> S[403 Forbidden]
    K -- Confere --> L
```



### Camadas de proteção


| Camada                       | Mecanismo                                                                                | Onde                  |
| ---------------------------- | ---------------------------------------------------------------------------------------- | --------------------- |
| **Autenticação**             | JWT no cookie `access_token` validado antes de emitir qualquer URL                       | `route.ts` — servidor |
| **Allowlist de tipos**       | Apenas `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`                          | `route.ts` — servidor |
| **Isolamento de path**       | Nome do arquivo gerado por `crypto.randomUUID()` — usuário não controla                  | `route.ts` — servidor |
| **Assinatura criptográfica** | RSA-SHA256 (GOOG4) — qualquer alteração na URL ou headers invalida o upload              | GCS                   |
| **Expiração**                | Signed URL válida por apenas 15 minutos                                                  | GCS                   |
| **Headers fixos**            | `X-Goog-SignedHeaders` inclui `content-type` e `x-goog-acl` — GCS verifica               | GCS                   |
| **ACL por objeto**           | `x-goog-acl: public-read` torna o objeto público individualmente, **sem expor o bucket** | GCS                   |
| **Validação client-side**    | Tipo e tamanho verificados antes de qualquer requisição (UX, não segurança)              | Browser               |
| **Validação de URL no form** | Zod exige que URLs de imagem comecem com `https://storage.googleapis.com/`               | `new-course-form.tsx` |


### Por que as credenciais nunca chegam ao browser?

O padrão Signed URL resolve o problema clássico de upload seguro:

```mermaid
graph LR
    subgraph "Abordagem ingênua (INSEGURA)"
        A1[Browser] -->|envia arquivo| B1[Next.js]
        B1 -->|re-envia para GCS| C1[GCS]
        note1["Dobra o tráfego de rede<br/>Expõe credenciais se vazar<br/>Limita tamanho pelo servidor"]
    end

    subgraph "Abordagem adotada (SEGURA)"
        A2[Browser] -->|POST contentType| B2[Next.js]
        B2 -->|assina com private_key| C2[GCS SDK]
        C2 -->|Signed URL temporária| B2
        B2 -->|Signed URL + publicUrl| A2
        A2 -->|PUT direto| C3[GCS]
        note2["Credenciais nunca saem do servidor<br/>Upload não passa pelo Next.js<br/>URL expira em 15 min"]
    end
```



---

## Detalhes da Signed URL (GOOG4-RSA-SHA256)

A Signed URL gerada contém os seguintes parâmetros na query string:


| Parâmetro              | Valor                                                                                                  | Significado                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `X-Goog-Algorithm`     | `GOOG4-RSA-SHA256`                                                                                     | Algoritmo de assinatura (RSA com SHA-256)                       |
| `X-Goog-Credential`    | `prefrio-media-upload@rj-superapp-staging.iam.gserviceaccount.com/20260612/auto/storage/goog4_request` | Service account + data + escopo                                 |
| `X-Goog-Date`          | `20260612T194504Z`                                                                                     | Timestamp UTC da criação                                        |
| `X-Goog-Expires`       | `900`                                                                                                  | TTL em segundos (15 minutos)                                    |
| `X-Goog-SignedHeaders` | `content-type;host;x-goog-acl`                                                                         | Headers que o browser **deve** enviar exatamente como assinados |
| `X-Goog-Signature`     | `68815da6...`                                                                                          | Assinatura RSA do payload completo                              |


O path do objeto no bucket segue a estrutura:

```
superapp/images/courses/<uuid-v4>.<ext>
```

Exemplo: `superapp/images/courses/6482de95-8307-4f59-9065-88afb3b4bbff.png`

---

## Componente `ImageUpload`

### Props


| Prop              | Tipo                                | Padrão  | Descrição                                                                   |
| ----------------- | ----------------------------------- | ------- | --------------------------------------------------------------------------- |
| `value`           | `string | null`                     | —       | URL atual da imagem                                                         |
| `onChange`        | `(url: string | undefined) => void` | —       | Callback com a URL pública após upload                                      |
| `label`           | `string`                            | —       | Label do campo                                                              |
| `maxSize`         | `number`                            | `1MB`   | Tamanho máximo em bytes                                                     |
| `requireSquare`   | `boolean`                           | `false` | Rejeita imagens não quadradas                                               |
| `cropAspectRatio` | `number`                            | —       | Se definido, abre dialog de recorte com esse aspect ratio (ex: `16/9`, `1`) |
| `defaultValue`    | `string`                            | —       | Exibe botão "Restaurar padrão" quando vazio                                 |
| `disabled`        | `boolean`                           | `false` | Desabilita interações                                                       |


### Fluxo interno do componente

```mermaid
flowchart TD
    A([Usuário seleciona arquivo]) --> B{Tipo permitido?<br/>jpeg/png/webp/svg}
    B -- Não --> C[Toast de erro]
    B -- Sim --> D{Tamanho <= maxSize?}
    D -- Não --> E[Toast de erro]
    D -- Sim --> F{requireSquare?}
    F -- Sim --> G{width === height?}
    G -- Não --> H[Toast de erro]
    G -- Sim --> I{cropAspectRatio<br/>definido?}
    F -- Não --> I
    I -- Sim --> J[Abre ImageCropDialog]
    J --> K{Usuário confirmou?}
    K -- Cancelou --> L[Limpa input]
    K -- Confirmou --> M[Canvas extrai Blob recortado]
    M --> N[uploadBlob]
    I -- Não --> N
    N --> O[POST /api/upload/signed-url]
    O --> P{200 OK?}
    P -- Não --> Q[Toast de erro]
    P -- Sim --> R[PUT direto no GCS]
    R --> S{200 OK?}
    S -- Não --> T[Toast de erro]
    S -- Sim --> U[onChange publicUrl]
    U --> V([Imagem exibida no preview])
```



### Uso no formulário de cursos

```tsx
// Logo institucional — com valor padrão e sem crop
<ImageUpload
  value={field.value}
  onChange={field.onChange}
  label="Logo institucional *"
  defaultValue={DEFAULT_INSTITUTIONAL_LOGO_URL}
/>

// Imagem de capa — com crop widescreen 16:9
<ImageUpload
  value={field.value}
  onChange={field.onChange}
  label="Imagem de capa *"
  cropAspectRatio={16 / 9}
/>
```

---

## Componente `ImageCropDialog`

Utiliza `react-easy-crop` para permitir que o usuário ajuste o recorte antes do upload. O processamento ocorre inteiramente no browser via **Canvas API** — nenhum dado extra trafega pelo servidor.

```mermaid
flowchart LR
    A[imageSrc<br/>object URL] --> B[Cropper<br/>react-easy-crop]
    B --> C{Usuário ajusta<br/>posição e zoom}
    C --> D[onCropComplete<br/>retorna pixelCrop]
    D --> E[Usuário clica<br/>Confirmar]
    E --> F[cropImageToBlob]
    F --> G[canvas.drawImage<br/>recorta área]
    G --> H[canvas.toBlob<br/>outputType]
    H --> I[Blob recortado]
    I --> J[uploadBlob]
```



**Props principais:**


| Prop         | Tipo                                        | Descrição                      |
| ------------ | ------------------------------------------- | ------------------------------ |
| `aspect`     | `number`                                    | Proporção travada (ex: `16/9`) |
| `outputType` | `'image/jpeg' | 'image/png' | 'image/webp'` | Formato de saída               |
| `onConfirm`  | `(blob: Blob) => void`                      | Callback com imagem recortada  |


> SVG é convertido para PNG ao entrar no dialog de recorte, pois o Canvas não exporta SVG como Blob de imagem.

---

## Variáveis de Ambiente Necessárias


| Variável           | Descrição                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `GCS_BUCKET_NAME`  | Nome do bucket GCS (ex: `rj-superapp-staging-prefrio`)                                            |
| `GCS_CLIENT_EMAIL` | Email da service account (ex: `prefrio-media-upload@rj-superapp-staging.iam.gserviceaccount.com`) |
| `GCS_PRIVATE_KEY`  | Chave privada RSA da service account (com `\n` escapado)                                          |


Todas são **server-side only** (sem prefixo `NEXT_PUBLIC_`) e nunca chegam ao browser.

### Permissões necessárias na service account


| Permissão IAM                  | Motivo                        |
| ------------------------------ | ----------------------------- |
| `storage.objects.create`       | Criar novos objetos no bucket |
| `storage.objects.get`          | Necessário para assinar URLs  |
| `iam.serviceAccounts.signBlob` | Assinar URLs com RSA (GOOG4)  |


O bucket deve ter **controle de acesso uniforme desativado** (fine-grained ACL) para que o header `x-goog-acl: public-read` por objeto funcione.

---

## Validação no Formulário (Zod)

Os campos de imagem no formulário de cursos validam que a URL pertence ao bucket do GCS:

```ts
const validateGoogleCloudStorageURL = (url: string | undefined) => {
  if (!url || url.trim() === '') return true // drafts aceitam vazio
  return url.startsWith('https://storage.googleapis.com/')
}

institutional_logo: z
  .string()
  .url()
  .refine(validateGoogleCloudStorageURL, {
    message: 'Logo institucional deve ser uma URL do bucket do Google Cloud Storage.',
  }),
```

Isso impede que qualquer URL externa seja salva nos campos de imagem, garantindo que apenas objetos hospedados no GCS controlado pela plataforma sejam aceitos.

---

## Caching e CDN

O GCS retorna headers de cache para objetos públicos:

```
cache-control: public, max-age=3600
expires: <agora + 1 hora>
ETag: "59f7b5c3e01c5c9a9d6def8b615bb63c"
```

Isso significa que imagens ficam em cache no browser por 1 hora após o primeiro acesso. O nome UUID único por upload previne colisões e permite cache agressivo sem invalidação explícita.