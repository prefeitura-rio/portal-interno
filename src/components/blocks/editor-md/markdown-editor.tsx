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
  simpleMode?: boolean // Only bold, italic, strikethrough, and link
  minHeight?: string // Custom min height (default: 120px for normal, 40px for simple)
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  disabled = false,
  className,
  maxLength,
  showCharCount = false,
  simpleMode = false,
  minHeight,
}: MarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: simpleMode
      ? [
          // Simple mode: only paragraph, text, bold, italic, strike, and link
          StarterKit.configure({
            heading: false,
            blockquote: false,
            codeBlock: false,
            horizontalRule: false,
            bulletList: false,
            orderedList: false,
          }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: 'text-blue-600 underline hover:text-blue-800',
            },
          }),
          CharacterCount.configure({
            limit: maxLength,
          }),
        ]
      : [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3, 4, 5, 6],
              HTMLAttributes: {
                class: 'heading-node',
              },
            },
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
          'prose prose-sm max-w-none focus:outline-none p-3 bg-transparent',
          simpleMode
            ? minHeight || 'min-h-[40px]'
            : minHeight || 'min-h-[120px]',
          'markdown-editor-content',
          disabled && 'cursor-not-allowed opacity-50',
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = getMarkdownFromEditor(editor)
      onChange(markdown)
    },
    onBlur: ({ editor }) => {
      // Force sync on blur to ensure value is always up to date
      const markdown = getMarkdownFromEditor(editor)
      onChange(markdown)
    },
    onCreate: ({ editor }) => {
      // Ensure initial sync when editor is created
      const markdown = getMarkdownFromEditor(editor)
      if (markdown !== value) {
        onChange(markdown)
      }
    },
  })

  // Update editor content when value changes externally
  // Only update if the editor is not focused to avoid disrupting user input
  useEffect(() => {
    if (!editor) return

    const currentMarkdown = getMarkdownFromEditor(editor)
    // Normalize both values for comparison (trim whitespace)
    const normalizedValue = (value || '').trim()
    const normalizedCurrent = currentMarkdown.trim()
    const hasExternalChange = normalizedValue !== normalizedCurrent

    // Only update content if:
    // 1. There's an actual change from external source
    // 2. The editor is not focused (to avoid disrupting user input)
    if (hasExternalChange && !editor.isFocused) {
      editor.commands.setContent(parseMarkdownToHtml(value || ''))
    }
  }, [value, editor])

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (!editor) return

    const isCurrentlyEditable = editor.isEditable
    const shouldBeEditable = !disabled

    // Only update if there's a change to avoid unnecessary re-renders
    if (isCurrentlyEditable !== shouldBeEditable) {
      editor.setEditable(shouldBeEditable)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  const charCount = editor.storage.characterCount?.characters() || 0
  const isOverLimit = maxLength ? charCount > maxLength : false

  return (
    <div className="w-full">
      {!disabled && <MarkdownToolbar editor={editor} simpleMode={simpleMode} />}

      <div
        className={cn(
          'border border-input rounded-md bg-background dark:bg-input/30 shadow-xs transition-[color,box-shadow]',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          disabled && 'opacity-50 cursor-not-allowed',
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
