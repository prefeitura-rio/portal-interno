'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Strikethrough,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { LinkDialog } from './link-dialog'

interface MarkdownToolbarProps {
  editor: Editor
}

export function MarkdownToolbar({ editor }: MarkdownToolbarProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  const openLinkDialog = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href || ''
    setCurrentUrl(previousUrl)
    setShowLinkDialog(true)
  }, [editor])

  const handleLinkConfirm = useCallback(
    (url: string) => {
      // empty - remove link
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }

      // update link
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run()
    },
    [editor]
  )

  const toolbarButtons = [
    {
      icon: Bold,
      label: 'Negrito (Ctrl+B)',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: 'Itálico (Ctrl+I)',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      icon: Strikethrough,
      label: 'Riscado',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
    },
    {
      icon: Heading2,
      label: 'Título (##)',
      action: () => {
        if (editor.isActive('heading', { level: 2 })) {
          editor.chain().focus().setParagraph().run()
        } else {
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      },
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: List,
      label: 'Lista com marcadores',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: 'Lista numerada',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      icon: ListTodo,
      label: 'Lista de tarefas',
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive('taskList'),
    },
    {
      icon: LinkIcon,
      label: 'Link',
      action: openLinkDialog,
      isActive: editor.isActive('link'),
    },
  ]

  return (
    <>
      <div className="border rounded-md p-1 mb-2 flex flex-wrap gap-1 bg-card">
        {toolbarButtons.map((button, index) => {
          const Icon = button.icon
          return (
            <Button
              key={index}
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={e => {
                e.preventDefault()
                button.action()
              }}
              className={cn('h-8 w-8 p-0', button.isActive && 'bg-muted')}
              title={button.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>

      <LinkDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        onConfirm={handleLinkConfirm}
        initialUrl={currentUrl}
      />
    </>
  )
}
