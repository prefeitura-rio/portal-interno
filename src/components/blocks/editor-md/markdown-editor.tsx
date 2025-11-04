'use client'

import {
  getMarkdownFromEditor,
  parseMarkdownToHtml,
} from '@/lib/markdown-serializer'
import { cn } from '@/lib/utils'
import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Typography from '@tiptap/extension-typography'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { MarkdownToolbar } from './markdown-toolbar'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  maxLength?: number
  showCharCount?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  disabled = false,
  className,
  maxLength,
  showCharCount = false,
}: MarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
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
        nested: true,
      }),
      Typography,
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content: parseMarkdownToHtml(value || ''),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3',
          disabled && 'bg-muted cursor-not-allowed opacity-60',
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = getMarkdownFromEditor(editor)
      onChange(markdown)
    },
  })

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== getMarkdownFromEditor(editor)) {
      editor.commands.setContent(parseMarkdownToHtml(value || ''))
    }
  }, [value, editor])

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  const charCount = editor.storage.characterCount?.characters() || 0
  const isOverLimit = maxLength ? charCount > maxLength : false

  return (
    <div className="w-full">
      {!disabled && <MarkdownToolbar editor={editor} />}

      <div
        className={cn(
          'border rounded-md',
          disabled && 'bg-background',
          isOverLimit && 'border-destructive'
        )}
      >
        <EditorContent editor={editor} />
      </div>

      {/* {showCharCount && maxLength && (
        <div
          className={cn(
            'text-xs text-right mt-1',
            isOverLimit ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {charCount} / {maxLength}
        </div>
      )} */}
    </div>
  )
}
