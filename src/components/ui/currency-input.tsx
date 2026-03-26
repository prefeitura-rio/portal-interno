'use client'

import { Input } from '@/components/ui/input'
import {
  formatCurrencyInput,
  formatNumberToBRL,
  parseBRLToNumber,
} from '@/lib/currency-utils'
import * as React from 'react'

interface CurrencyInputProps {
  value?: number | null
  onChange?: (value: number | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(
  (
    {
      value,
      onChange,
      placeholder = 'R$ 0,00',
      disabled = false,
      className,
      id,
    },
    ref
  ) => {
    // Estado local para valor formatado (string com máscara BRL)
    const [displayValue, setDisplayValue] = React.useState<string>(() => {
      if (value !== null && value !== undefined) {
        return formatNumberToBRL(value)
      }
      return ''
    })

    // Sincronizar quando valor externo mudar (ex: carregar vaga da API)
    React.useEffect(() => {
      if (value !== null && value !== undefined) {
        setDisplayValue(formatNumberToBRL(value))
      } else {
        setDisplayValue('')
      }
    }, [value])

    // Handler para mudanças no input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      // Se usuário apagou tudo, limpar campo
      if (inputValue === '' || inputValue === 'R$ ') {
        setDisplayValue('')
        onChange?.(null)
        return
      }

      // Aplica formatação em tempo real
      const formatted = formatCurrencyInput(inputValue)
      setDisplayValue(formatted)

      // Parse para número e atualiza form state
      // IMPORTANTE: Mantém como number para compatibilidade com API
      const numericValue = parseBRLToNumber(formatted)
      onChange?.(numericValue)
    }

    // Handler para blur - garantir formatação completa
    const handleBlur = () => {
      if (displayValue && displayValue !== '') {
        const numericValue = parseBRLToNumber(displayValue)
        if (numericValue !== null) {
          setDisplayValue(formatNumberToBRL(numericValue))
        }
      }
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        id={id}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
