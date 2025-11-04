# Documentação: Implementação Tiptap + Markdown

## Visão Geral

Esta documentação descreve a implementação de um editor e visualizador de Markdown usando a biblioteca [Tiptap](https://tiptap.dev/) no projeto Portal Interno. O sistema permite que usuários editem conteúdo com formatação rica através de uma interface WYSIWYG (What You See Is What You Get), enquanto mantém o armazenamento no formato Markdown.

### Arquitetura

A implementação consiste em 4 componentes principais + 1 módulo de serialização:

```
src/components/blocks/editor-md/
├── markdown-editor.tsx      # Editor interativo com toolbar
├── markdown-viewer.tsx      # Visualizador read-only
├── markdown-toolbar.tsx     # Barra de ferramentas de formatação
├── link-dialog.tsx          # Dialog para inserir/editar links
└── index.ts                 # Exports públicos

src/lib/
└── markdown-serializer.ts   # Conversão Markdown ↔ HTML/JSON
```

### Fluxo de Dados

```
Markdown (string)
    ↓ parseMarkdownToHtml()
HTML/JSON (Tiptap)
    ↓ Editor/Viewer
Interação do Usuário
    ↓ onChange
HTML/JSON (Tiptap)
    ↓ getMarkdownFromEditor()
Markdown (string)
```

---

## Extensões Tiptap Utilizadas

### StarterKit
Pacote base que inclui funcionalidades essenciais:
- **Document**: Nó raiz do documento
- **Paragraph**: Parágrafos
- **Text**: Nós de texto
- **Bold**: Texto em negrito (`**texto**`)
- **Italic**: Texto em itálico (`*texto*`)
- **Strike**: Texto riscado (`~~texto~~`)
- **Code**: Código inline (`` `código` ``)
- **CodeBlock**: Blocos de código (````` ``` `````)
- **BulletList**: Listas não ordenadas (`-` ou `*`)
- **OrderedList**: Listas ordenadas (`1.`)
- **ListItem**: Itens de lista
- **Blockquote**: Citações (`>`)
- **HardBreak**: Quebras de linha
- **HorizontalRule**: Linha horizontal (`---`)
- **Heading**: Títulos (`#` até `######`)

### Extensões Adicionais

- **Link**: Suporte a hyperlinks `[texto](url)`
- **TaskList**: Listas de tarefas
- **TaskItem**: Itens de lista com checkbox `- [ ]` ou `- [x]`
- **Typography**: Melhorias tipográficas automáticas
- **CharacterCount**: Contagem de caracteres (apenas no editor)

---

## Componentes

### 1. MarkdownEditor

Editor interativo com barra de ferramentas para formatação de texto.

#### Props

```typescript
interface MarkdownEditorProps {
  value: string              // Conteúdo em Markdown
  onChange: (value: string) => void  // Callback com Markdown atualizado
  placeholder?: string       // Texto placeholder (padrão: "Digite aqui...")
  disabled?: boolean         // Desabilita edição (padrão: false)
  className?: string         // Classes CSS adicionais
  maxLength?: number         // Limite de caracteres
  showCharCount?: boolean    // Exibe contador de caracteres (padrão: false)
}
```

#### Exemplo de Uso

```tsx
import { MarkdownEditor } from '@/components/blocks/editor-md'

function MyForm() {
  const [content, setContent] = useState('')

  return (
    <MarkdownEditor
      value={content}
      onChange={setContent}
      placeholder="Digite a descrição do serviço..."
      maxLength={500}
      showCharCount={true}
    />
  )
}
```

#### Uso no Formulário (new-service-form.tsx)

```tsx
<FormField
  control={form.control}
  name="shortDescription"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Descrição resumida do serviço*</FormLabel>
      <FormControl>
        <MarkdownEditor
          value={field.value || ''}
          onChange={field.onChange}
          placeholder="Descreva resumidamente o serviço oferecido"
          disabled={isLoading || readOnly}
          maxLength={500}
          showCharCount={true}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Comportamento

- **Toolbar**: Exibida apenas quando `disabled={false}`
- **Sincronização Bidirecional**: Atualiza quando `value` muda externamente
- **Limite de Caracteres**: Borda vermelha quando exceder `maxLength`
- **Contador**: Exibido em vermelho ao ultrapassar o limite

---

### 2. MarkdownViewer

Componente read-only para exibir conteúdo Markdown formatado.

#### Props

```typescript
interface MarkdownViewerProps {
  content: string     // Conteúdo em Markdown
  className?: string  // Classes CSS adicionais
}
```

#### Exemplo de Uso

```tsx
import { MarkdownViewer } from '@/components/blocks/editor-md'

function ServiceDetail({ service }) {
  return (
    <div>
      <h2>Descrição</h2>
      <MarkdownViewer content={service.description} />
    </div>
  )
}
```

#### Comportamento

- **Não editável**: Editor configurado com `editable: false`
- **Links clicáveis**: Links abrem em nova aba
- **Mensagem vazia**: Exibe "Nenhum conteúdo disponível" se vazio
- **Estilização**: Aplica estilos prose do Tailwind

---

### 3. MarkdownToolbar

Barra de ferramentas com botões de formatação.

#### Botões Disponíveis

| Ícone | Ação | Markdown | Atalho |
|-------|------|----------|--------|
| **B** | Negrito | `**texto**` | Ctrl+B |
| _I_ | Itálico | `*texto*` | Ctrl+I |
| ~~S~~ | Riscado | `~~texto~~` | - |
| • | Lista não ordenada | `- item` | - |
| 1. | Lista ordenada | `1. item` | - |
| ☑ | Lista de tarefas | `- [ ] tarefa` | - |
| 🔗 | Link | `[texto](url)` | - |

#### Comportamento

- **Estado Ativo**: Botões destacados quando formatação está ativa
- **Dialog de Link**: Abre modal para inserir/editar/remover links
- **Foco Mantido**: Retorna foco ao editor após ação

#### Exemplo de Personalização

```tsx
// Se precisar usar toolbar separadamente
import { MarkdownToolbar } from '@/components/blocks/editor-md'
import { useEditor } from '@tiptap/react'

function CustomEditor() {
  const editor = useEditor({
    // ... configurações
  })

  return (
    <>
      <MarkdownToolbar editor={editor} />
      <EditorContent editor={editor} />
    </>
  )
}
```

---

### 4. LinkDialog

Modal para inserir, editar ou remover hyperlinks.

#### Props

```typescript
interface LinkDialogProps {
  open: boolean                    // Estado de abertura do dialog
  onOpenChange: (open: boolean) => void  // Callback de mudança de estado
  onConfirm: (url: string) => void       // Callback com URL confirmada
  initialUrl?: string              // URL inicial para edição
}
```

#### Comportamento

- **Inserir**: Se `initialUrl` vazio, permite inserir novo link
- **Editar**: Se `initialUrl` preenchida, permite editar link existente
- **Remover**: Botão "Remover link" disponível ao editar
- **Enter**: Confirma ao pressionar Enter no input
- **Validação**: Aceita URLs vazias (para remover link)

---

## Serialização Markdown

### Módulo: markdown-serializer.ts

Responsável pela conversão bidirecional entre Markdown e o formato JSON/HTML do Tiptap.

### Funções Principais

#### 1. getMarkdownFromEditor(editor: Editor): string

Converte o conteúdo do editor Tiptap para string Markdown.

```typescript
import { getMarkdownFromEditor } from '@/lib/markdown-serializer'

const markdown = getMarkdownFromEditor(editor)
// Retorna: "# Título\n\nParagráfo com **negrito** e *itálico*"
```

#### 2. parseMarkdownToHtml(markdown: string): string

Converte string Markdown para HTML que o Tiptap consegue entender.

```typescript
import { parseMarkdownToHtml } from '@/lib/markdown-serializer'

const html = parseMarkdownToHtml('# Título\n\n**Negrito**')
// Retorna: "<h1>Título</h1><p><strong>Negrito</strong></p>"
```

### Mapeamento de Formatações

#### Inline (Marks)

| Markdown | HTML | Descrição |
|----------|------|-----------|
| `**texto**` | `<strong>texto</strong>` | Negrito |
| `*texto*` | `<em>texto</em>` | Itálico |
| `~~texto~~` | `<s>texto</s>` | Riscado |
| `` `código` `` | `<code>código</code>` | Código inline |
| `[link](url)` | `<a href="url">link</a>` | Hyperlink |

#### Block (Nodes)

| Markdown | HTML | Descrição |
|----------|------|-----------|
| `# Título` | `<h1>Título</h1>` | Título nível 1-6 |
| `- item` | `<ul><li>item</li></ul>` | Lista não ordenada |
| `1. item` | `<ol><li>item</li></ol>` | Lista ordenada |
| `- [ ] tarefa` | `<ul data-type="taskList">...` | Lista de tarefas |
| `- [x] feito` | `<li data-checked="true">...` | Tarefa concluída |
| ` ``` código ``` ` | `<pre><code>código</code></pre>` | Bloco de código |
| `> citação` | `<blockquote>citação</blockquote>` | Citação |
| `---` | `<hr>` | Linha horizontal |

### Listas Aninhadas

O serializador suporta listas aninhadas com indentação de 2 espaços:

```markdown
- Item 1
  - Subitem 1.1
  - Subitem 1.2
- Item 2
```

### Características Especiais

- **Escape HTML**: Caracteres especiais em blocos de código são escapados
- **Quebras de Linha**: Dois espaços + `\n` geram `<br>`
- **Parágrafos**: Separados por linha dupla (`\n\n`)
- **Listas**: Itens de lista mantêm estrutura de parágrafo

---

## Estilos Customizados (globals.css)

### ProseMirror Base

```css
.ProseMirror {
  outline: none;  /* Remove outline padrão */
}

.ProseMirror > * + * {
  margin-top: 0.75em;  /* Espaçamento entre blocos */
}
```

### Listas

```css
.ProseMirror ul,
.ProseMirror ol {
  padding: 0 1rem;
  margin: 0.5rem 0;
}

.ProseMirror ul {
  list-style-type: disc;  /* Marcadores de lista */
}

.ProseMirror ol {
  list-style-type: decimal;  /* Numeração */
}

.ProseMirror li {
  margin: 0.25rem 0;
}
```

### Task Lists

```css
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}

.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.ProseMirror ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
}

.ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
  cursor: pointer;
}
```

### Formatações Inline

```css
.ProseMirror strong {
  font-weight: 700;  /* Negrito */
}

.ProseMirror em {
  font-style: italic;  /* Itálico */
}

.ProseMirror s {
  text-decoration: line-through;  /* Riscado */
}
```

### Links

```css
.ProseMirror a {
  color: rgb(37 99 235);  /* Azul */
  text-decoration: underline;
  cursor: pointer;
}

.ProseMirror a:hover {
  color: rgb(29 78 216);  /* Azul mais escuro */
}
```

### Placeholder

```css
.ProseMirror p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
```

---

## Integração com React Hook Form

### Exemplo Completo

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MarkdownEditor } from '@/components/blocks/editor-md'

// Schema de validação
const schema = z.object({
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição não pode exceder 500 caracteres')
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: ''
    }
  })

  const onSubmit = (data: FormData) => {
    console.log(data.description) // String Markdown
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <MarkdownEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  maxLength={500}
                  showCharCount={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Salvar</Button>
      </form>
    </Form>
  )
}
```

### Validação de Caracteres

O contador de caracteres usa o `CharacterCount` do Tiptap, que conta:
- Letras, números e símbolos
- Espaços
- **NÃO conta** marcações Markdown (antes da serialização)

```tsx
const charCount = editor.storage.characterCount?.characters() || 0
const isOverLimit = maxLength ? charCount > maxLength : false
```

---

## Configurações Avançadas

### Customizar Editor

```tsx
const editor = useEditor({
  immediatelyRender: false,  // Evita SSR issues
  extensions: [
    StarterKit.configure({
      bulletList: {
        keepMarks: true,      // Mantém formatações em listas
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }),
    Link.configure({
      openOnClick: false,     // Não abre links ao clicar
      HTMLAttributes: {
        class: 'text-blue-600 underline hover:text-blue-800',
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: 'task-list',
      },
    }),
    TaskItem.configure({
      HTMLAttributes: {
        class: 'task-item',
      },
      nested: true,           // Permite task lists aninhadas
    }),
    Typography,               // Melhorias tipográficas
    CharacterCount.configure({
      limit: maxLength,
    }),
  ],
  content: parseMarkdownToHtml(value || ''),
  editable: !disabled,
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3',
    },
  },
  onUpdate: ({ editor }) => {
    const markdown = getMarkdownFromEditor(editor)
    onChange(markdown)
  },
})
```

### Sincronização Externa

Atualiza o editor quando o valor muda externamente:

```tsx
useEffect(() => {
  if (editor && value !== getMarkdownFromEditor(editor)) {
    editor.commands.setContent(parseMarkdownToHtml(value || ''))
  }
}, [value, editor])
```

### Habilitar/Desabilitar Dinamicamente

```tsx
useEffect(() => {
  if (editor) {
    editor.setEditable(!disabled)
  }
}, [disabled, editor])
```

---

## Casos de Uso no Projeto

### new-service-form.tsx

O formulário de serviços municipais usa o `MarkdownEditor` em 5 campos:

1. **shortDescription** (500 chars): Descrição resumida do serviço
2. **requestResult** (500 chars): Resultado da solicitação
3. **fullDescription** (2000 chars): Descrição completa do serviço
4. **requiredDocuments** (1000 chars): Documentos necessários
5. **instructionsForRequester** (1000 chars): Instruções para o solicitante

Todos com:
- Limite de caracteres
- Contador visível
- Validação via Zod
- Integração com React Hook Form

---

## Limitações e Considerações

### 1. Parser Markdown Simplificado

O parser customizado (`parseMarkdownToHtml`) é básico e não suporta:
- Markdown complexo aninhado (ex: lista dentro de blockquote)
- Tabelas
- Imagens
- HTML inline
- Atributos customizados

**Alternativa**: Para suporte completo, considere usar uma biblioteca como `remark` ou `marked`.

### 2. Serialização JSON

O Tiptap armazena internamente em JSON, não em Markdown. A conversão é feita apenas na entrada/saída:

```
Input (MD) → Parse → JSON (Tiptap) → Edit → Serialize → Output (MD)
```

Isso significa que:
- Variações sintáticas podem ser normalizadas (`*` → `_` para itálico)
- Espaçamentos podem mudar
- Comentários HTML são perdidos

### 3. Performance

Para documentos muito grandes (>10.000 caracteres):
- Considere debounce no `onChange`
- Avalie serialização assíncrona
- Monitore re-renders

### 4. SSR (Server-Side Rendering)

```tsx
immediatelyRender: false
```

Esta configuração evita problemas com hidratação no Next.js.

### 5. Acessibilidade

- Editor possui `role="textbox"`
- Botões da toolbar têm `title` para tooltips
- Checkbox de task list é acessível via teclado

---

## Troubleshooting

### Editor não atualiza com valor externo

**Problema**: Alterar `value` prop não reflete no editor.

**Solução**: Verificar se o `useEffect` de sincronização está presente:

```tsx
useEffect(() => {
  if (editor && value !== getMarkdownFromEditor(editor)) {
    editor.commands.setContent(parseMarkdownToHtml(value || ''))
  }
}, [value, editor])
```

### Contador de caracteres incorreto

**Problema**: Contador mostra valor diferente do esperado.

**Causa**: O contador conta caracteres do conteúdo renderizado, não do Markdown.

**Exemplo**:
- Markdown: `**bold**` (8 chars)
- Conteúdo: `bold` (4 chars) ✓ correto

### Links não clicáveis

**Problema**: Links não abrem ao clicar.

**Editor**: `openOnClick: false` (correto, para editar)

**Viewer**: `openOnClick: true` (permite clique)

### Estilos não aplicados

**Problema**: Formatações não aparecem visualmente.

**Solução**: Verificar se `globals.css` está importado no layout raiz:

```tsx
// app/layout.tsx
import './globals.css'
```

---

## Referências

- [Tiptap Documentation](https://tiptap.dev/)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Markdown Spec](https://commonmark.org/)
- [React Hook Form](https://react-hook-form.com/)

---

## Changelog

### Versão Atual

- ✅ Editor com toolbar (negrito, itálico, riscado, listas, links)
- ✅ Visualizador read-only
- ✅ Serialização Markdown ↔ HTML
- ✅ Task lists com checkboxes
- ✅ Limite de caracteres
- ✅ Integração React Hook Form
- ✅ Estilos customizados

### Possíveis Melhorias Futuras

- 🔲 Suporte a imagens
- 🔲 Suporte a tabelas
- 🔲 Suporte a código com syntax highlighting
- 🔲 Undo/Redo customizado
- 🔲 Colaboração em tempo real
- 🔲 Export para PDF
- 🔲 Parser Markdown mais robusto (remark/unified)
- 🔲 Toolbar flutuante (bubble menu)
- 🔲 Slash commands (/)
- 🔲 Mentions (@usuário)

---

**Autor**: Sistema Portal Interno  
**Última atualização**: Novembro 2025  
**Biblioteca**: Tiptap v2.x

