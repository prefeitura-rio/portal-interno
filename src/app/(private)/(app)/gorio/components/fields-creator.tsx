'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@/components/ui/sortable'
import {
  ChevronDown,
  CircleCheck,
  GripVertical,
  Plus,
  Square,
  Text as TextIcon,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

export type CustomFieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'multiselect'

export interface CustomFieldOption {
  id: string
  value: string
}

export interface CustomField {
  id: string
  title: string
  required: boolean
  field_type: CustomFieldType
  options?: CustomFieldOption[]
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
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text')
  const [newFieldOptions, setNewFieldOptions] = useState<CustomFieldOption[]>([
    { id: uuidv4(), value: '' },
  ])

  const fieldTypes = [
    {
      value: 'text' as CustomFieldType,
      label: 'Resposta curta',
      icon: TextIcon,
      description: 'Texto de resposta curta',
    },
    {
      value: 'radio' as CustomFieldType,
      label: 'Seleção única',
      icon: CircleCheck,
      description: 'Permite selecionar apenas uma opção',
    },
    {
      value: 'multiselect' as CustomFieldType,
      label: 'Seleção múltipla',
      icon: Square,
      description: 'Permite selecionar múltiplas opções',
    },
    {
      value: 'select' as CustomFieldType,
      label: 'Seleção em pulldown',
      icon: ChevronDown,
      description: 'Lista suspensa para seleção única',
    },
  ]

  const resetForm = () => {
    setNewFieldTitle('')
    setNewFieldRequired(false)
    setNewFieldType('text')
    setNewFieldOptions([{ id: uuidv4(), value: '' }])
  }

  const addField = () => {
    if (!isFieldValid()) return

    const requiresOptions = ['radio', 'multiselect', 'select'].includes(
      newFieldType
    )

    const newField: CustomField = {
      id: uuidv4(),
      title: newFieldTitle.trim(),
      required: newFieldRequired,
      field_type: newFieldType,
      options: requiresOptions
        ? newFieldOptions.filter(opt => opt.value.trim())
        : undefined,
    }

    // Add new field
    onFieldsChange([...fields, newField])

    resetForm()
  }

  const removeField = (fieldId: string) => {
    onFieldsChange(fields.filter(field => field.id !== fieldId))
  }

  const addOption = () => {
    setNewFieldOptions([...newFieldOptions, { id: uuidv4(), value: '' }])
  }

  const updateOption = (optionId: string, value: string) => {
    setNewFieldOptions(
      newFieldOptions.map(opt =>
        opt.id === optionId ? { ...opt, value } : opt
      )
    )
  }

  const removeOption = (optionId: string) => {
    if (newFieldOptions.length > 1) {
      setNewFieldOptions(newFieldOptions.filter(opt => opt.id !== optionId))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addField()
    }
  }

  const selectedFieldType = fieldTypes.find(type => type.value === newFieldType)
  const requiresOptions = ['radio', 'multiselect', 'select'].includes(
    newFieldType
  )

  // Check if field is valid for submission
  const isFieldValid = () => {
    if (!newFieldTitle.trim()) return false

    if (requiresOptions) {
      const validOptions = newFieldOptions.filter(opt => opt.value.trim())
      return validOptions.length >= 2
    }

    return true
  }

  const renderFieldPreview = (field: CustomField, showDragHandle = true) => {
    const fieldTypeInfo = fieldTypes.find(
      type => type.value === field.field_type
    )
    const Icon = fieldTypeInfo?.icon || TextIcon

    return (
      <div className="space-y-3 p-4 border rounded-lg bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showDragHandle && (
              <SortableItemHandle asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="cursor-grab hover:bg-muted/50 p-1 h-8 w-8"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </SortableItemHandle>
            )}
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{field.title}</span>
            {field.required && (
              <Badge variant="secondary" className="text-xs">
                Obrigatório
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeField(field.id)}
              disabled={disabled}
              className="text-destructive hover:text-destructive h-8 w-8 p-1"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Field preview based on type */}
        {field.field_type === 'text' && (
          <div className="pl-6">
            <Input
              placeholder="Texto de resposta curta"
              disabled
              className="bg-muted/50"
            />
          </div>
        )}

        {field.field_type === 'select' && (
          <div className="pl-6">
            <Select disabled>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
            </Select>
            {field.options && (
              <div className="mt-2 text-sm text-muted-foreground">
                Opções: {field.options.map(opt => opt.value).join(', ')}
              </div>
            )}
          </div>
        )}

        {field.field_type === 'radio' && field.options && (
          <div className="pl-6 space-y-2">
            {field.options.map(option => (
              <div key={option.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                <span className="text-sm">{option.value}</span>
              </div>
            ))}
          </div>
        )}

        {field.field_type === 'multiselect' && field.options && (
          <div className="pl-6 space-y-2">
            {field.options.map(option => (
              <div key={option.id} className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted-foreground rounded" />
                <span className="text-sm">{option.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add/Edit field section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Título do campo
            </Label>
            <Input
              placeholder="Digite o título do campo (ex: Quantos anos você tem?)"
              value={newFieldTitle}
              onChange={e => setNewFieldTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              className="mt-1"
              disabled={disabled}
            />
          </div>

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

          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Tipo de campo
            </Label>
            <Select
              value={newFieldType}
              onValueChange={(value: CustomFieldType) => {
                setNewFieldType(value)
                if (!requiresOptions) {
                  setNewFieldOptions([{ id: uuidv4(), value: '' }])
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map(type => {
                  const Icon = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {selectedFieldType && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFieldType.description}
              </p>
            )}
          </div>

          {/* Options configuration for select/radio/multiselect fields */}
          {requiresOptions && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">
                Opções de resposta
              </Label>
              {newFieldOptions.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  {newFieldType === 'radio' && (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                  )}
                  {newFieldType === 'multiselect' && (
                    <div className="w-4 h-4 border-2 border-muted-foreground rounded flex-shrink-0" />
                  )}
                  <Input
                    placeholder={`Opção ${index + 1}`}
                    value={option.value}
                    onChange={e => updateOption(option.id, e.target.value)}
                    disabled={disabled}
                    className="flex-1"
                  />
                  {newFieldOptions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(option.id)}
                      disabled={disabled}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addOption}
                disabled={disabled}
                className="text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar opção
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={addField}
              disabled={!isFieldValid() || disabled}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar campo
            </Button>
          </div>
        </div>

        {/* Display existing fields with sorting */}
        {fields.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Campos adicionados ({fields.length})
            </h4>
            <Sortable
              value={fields}
              onValueChange={onFieldsChange}
              getItemValue={field => field.id}
            >
              <SortableContent withoutSlot>
                <div className="space-y-4">
                  {fields.map(field => (
                    <SortableItem key={field.id} value={field.id} asChild>
                      <div>{renderFieldPreview(field)}</div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContent>
              <SortableOverlay>
                {({ value }) => {
                  const field = fields.find(f => f.id === value)
                  return field ? (
                    <div className="opacity-90">
                      {renderFieldPreview(field, false)}
                    </div>
                  ) : null
                }}
              </SortableOverlay>
            </Sortable>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
