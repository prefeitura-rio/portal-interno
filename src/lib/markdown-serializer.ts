import type { Editor } from '@tiptap/react'

/**
 * Convert Tiptap JSON to Markdown
 */
export function getMarkdownFromEditor(editor: Editor): string {
  const json = editor.getJSON()
  return jsonToMarkdown(json)
}

/**
 * Convert JSON to Markdown recursively
 */
function jsonToMarkdown(node: any, listLevel = 0): string {
  if (!node) return ''

  // Handle text nodes
  if (node.type === 'text') {
    let text = node.text || ''

    // Apply marks
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `**${text}**`
            break
          case 'italic':
            text = `*${text}*`
            break
          case 'strike':
            text = `~~${text}~~`
            break
          case 'link':
            text = `[${text}](${mark.attrs?.href || ''})`
            break
          case 'code':
            text = `\`${text}\``
            break
        }
      }
    }

    return text
  }

  // Handle content array
  let result = ''
  const content = node.content || []

  switch (node.type) {
    case 'doc':
      result = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('\n\n')
      break

    case 'paragraph':
      result = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('')
      break

    case 'heading': {
      const level = node.attrs?.level || 1
      const headingText = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('')
      result = `${'#'.repeat(level)} ${headingText}`
      break
    }

    case 'bulletList':
      result = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('\n')
      break

    case 'orderedList':
      result = content
        .map((child: any, index: number) => {
          const itemContent = jsonToMarkdown(child, listLevel)
          return itemContent.replace(/^- /, `${index + 1}. `)
        })
        .join('\n')
      break

    case 'listItem': {
      const indent = '  '.repeat(listLevel)
      const itemText = content
        .map((child: any) => {
          if (child.type === 'paragraph') {
            return (
              child.content
                ?.map((c: any) => jsonToMarkdown(c, listLevel))
                .join('') || ''
            )
          }
          if (child.type === 'bulletList' || child.type === 'orderedList') {
            return `\n${jsonToMarkdown(child, listLevel + 1)}`
          }
          return jsonToMarkdown(child, listLevel)
        })
        .join('\n')
      result = `${indent}- ${itemText}`
      break
    }

    case 'taskList':
      result = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('\n')
      break

    case 'taskItem': {
      const checked = node.attrs?.checked ? 'x' : ' '
      const taskText = content
        .map((child: any) => {
          if (child.type === 'paragraph') {
            return (
              child.content
                ?.map((c: any) => jsonToMarkdown(c, listLevel))
                .join('') || ''
            )
          }
          return jsonToMarkdown(child, listLevel)
        })
        .join('')
      result = `- [${checked}] ${taskText}`
      break
    }

    case 'codeBlock': {
      const code = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('')
      result = `\`\`\`\n${code}\n\`\`\``
      break
    }

    case 'blockquote': {
      const quote = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('\n')
      result = quote
        .split('\n')
        .map((line: string) => `> ${line}`)
        .join('\n')
      break
    }

    case 'hardBreak':
      result = '  \n'
      break

    case 'horizontalRule':
      result = '---'
      break

    default:
      result = content
        .map((child: any) => jsonToMarkdown(child, listLevel))
        .join('')
  }

  return result
}

/**
 * Parse Markdown to HTML for Tiptap
 * This is a simple parser for basic markdown features
 */
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === '') return '<p></p>'

  // First, normalize multiple newlines to double newlines
  // Then split by double newlines for paragraphs
  const normalized = markdown.replace(/\n{3,}/g, '\n\n')
  const blocks = normalized.split(/\n\n+/)

  const html = blocks
    .map(block => {
      // Headings
      if (block.match(/^#{1,6}\s/)) {
        const level = block.match(/^#+/)?.[0].length || 1
        const text = block.replace(/^#+\s/, '')
        return `<h${level}>${parseInlineMarkdown(text, true)}</h${level}>`
      }

      // Task lists
      if (block.match(/^- \[[ x]\]/m)) {
        const items = block
          .split('\n')
          .map(line => {
            const checked = line.includes('[x]')
            const text = line.replace(/^- \[[ x]\]\s*/, '')
            return `<li data-type="taskItem" data-checked="${checked}">${parseInlineMarkdown(text, true)}</li>`
          })
          .join('')
        return `<ul data-type="taskList">${items}</ul>`
      }

      // Bullet lists
      if (block.match(/^[-*]\s/m)) {
        const items = block
          .split('\n')
          .map(line => {
            const text = line.replace(/^[-*]\s/, '')
            return `<li><p>${parseInlineMarkdown(text, true)}</p></li>`
          })
          .join('')
        return `<ul>${items}</ul>`
      }

      // Ordered lists
      if (block.match(/^\d+\.\s/m)) {
        const items = block
          .split('\n')
          .map(line => {
            const text = line.replace(/^\d+\.\s/, '')
            return `<li><p>${parseInlineMarkdown(text, true)}</p></li>`
          })
          .join('')
        return `<ol>${items}</ol>`
      }

      // Code blocks
      if (block.match(/^```/)) {
        const code = block.replace(/^```\n?/, '').replace(/\n?```$/, '')
        return `<pre><code>${escapeHtml(code)}</code></pre>`
      }

      // Blockquotes
      if (block.match(/^>/m)) {
        const text = block
          .split('\n')
          .map(line => line.replace(/^>\s?/, ''))
          .join('\n')
        return `<blockquote><p>${parseInlineMarkdown(text, true)}</p></blockquote>`
      }

      // Horizontal rule
      if (block.match(/^---$/)) {
        return '<hr>'
      }

      // Regular paragraph - convert single \n to <br>
      return `<p>${parseInlineMarkdown(block, true)}</p>`
    })
    .join('')

  return html
}

/**
 * Parse inline markdown (bold, italic, links, etc.)
 * @param text - Text to parse
 * @param convertSingleNewlines - If true, converts single \n to <br>
 */
function parseInlineMarkdown(
  text: string,
  convertSingleNewlines = false
): string {
  let result = text

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Strikethrough
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>')

  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Line breaks
  if (convertSingleNewlines) {
    // Convert all single \n to <br> (since we're already inside a block that was split by \n\n)
    // First handle two spaces + \n (standard markdown line break)
    result = result.replace(/ {2}\n/g, '<br>')
    // Then convert remaining single \n to <br>
    result = result.replace(/\n/g, '<br>')
  } else {
    // Only handle two spaces + \n (standard markdown line break)
    result = result.replace(/ {2}\n/g, '<br>')
  }

  return result
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, char => map[char])
}
