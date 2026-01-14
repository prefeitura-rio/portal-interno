# Service Preview Components

## O que é?

Componentes para pré-visualização de serviços municipais dentro do portal, replicando a aparência e estrutura da página pública

## Por que foi criado?

Permite que gestores visualizem como o serviço aparecerá para os cidadãos antes de publicar.

## Arquitetura

### Componentes principais:

- **`copyable-item.tsx`**: Item visual com ícone de copiar (sem funcionalidade)
- **`digital-channels.tsx`**: Lista de canais de atendimento
- **`legislation-item.tsx`**: Item de legislação
- **`main-information.tsx`**: Seção de informações principais do serviço
- **`markdown-renderer.tsx`**: Wrapper do MarkdownViewer existente
- **`quick-info.tsx`**: Componentes de informação rápida (custo, tempo, categoria)
- **`quick-info-address.tsx`**: Endereços com expand/collapse **funcional**
- **`text-blocks.tsx`**: Blocos de texto expansíveis

### Componentes wrapper:

- **`page-client.tsx`**: Organiza todos os componentes na estrutura da página
- **`page-client-wrapper.tsx`**: Wrapper com header e estilos customizados
- **`service-preview-modal.tsx`**: Modal responsivo que envolve tudo

### Utilitários:

- **`service-preview-mapper.ts`**: Converte dados do formulário para formato `ModelsPrefRioService`

## Estilos

Os componentes usam CSS variables customizadas para replicar as cores do SuperApp:
- Background: `#f9fafb`
- Primary: `#13335a`
- Card: `#f1f1f4`

Estilos são isolados via classe `.preview-wrapper` e não afetam o resto da aplicação.

## Notas técnicas

- Componentes não fazem fetch de dados (recebem via props)
- Usa tipos do `http-busca-search` para consistência
- Integrado com `useDepartment` hook para buscar nome do órgão gestor
