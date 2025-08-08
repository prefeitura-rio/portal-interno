'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export interface CustomField {
  id: string
  title: string
  required: boolean
}

interface FieldsCreatorProps {
  fields: CustomField[]
  onFieldsChange: (fields: CustomField[]) => void
  title?: string
  disabled?: boolean
}

export function FieldsCreator({
  fields,
  onFieldsChange,
  title = 'Informações complementares para a inscrição de participantes',
  disabled = false,
}: FieldsCreatorProps) {
  const [newFieldTitle, setNewFieldTitle] = useState('')
  const [newFieldRequired, setNewFieldRequired] = useState(false)

  const addField = () => {
    if (!newFieldTitle.trim()) return

    const newField: CustomField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newFieldTitle.trim(),
      required: newFieldRequired,
    }

    onFieldsChange([...fields, newField])
    setNewFieldTitle('')
    setNewFieldRequired(false)
  }

  const removeField = (fieldId: string) => {
    onFieldsChange(fields.filter(field => field.id !== fieldId))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addField()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new field section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <Input
            placeholder="Título do campo"
            value={newFieldTitle}
            onChange={e => setNewFieldTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full"
            disabled={disabled}
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="required-field"
              checked={newFieldRequired}
              onCheckedChange={checked =>
                setNewFieldRequired(checked as boolean)
              }
              disabled={disabled}
            />
            <label
              htmlFor="required-field"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Campo obrigatório
            </label>
          </div>

          <Button
            onClick={addField}
            disabled={!newFieldTitle.trim() || disabled}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar campo
          </Button>
        </div>

        {/* Display existing fields */}
        {fields.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Campos adicionados ({fields.length})
            </h4>
            <div className="space-y-2">
              {fields.map(field => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{field.title}</span>
                    {field.required && (
                      <Badge variant="secondary" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
