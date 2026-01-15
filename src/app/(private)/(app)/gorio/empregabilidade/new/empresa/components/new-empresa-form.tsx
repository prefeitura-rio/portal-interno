'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Search } from 'lucide-react'

// Format CNPJ: XX.XXX.XXX/XXXX-XX
const formatCNPJ = (cnpj: string): string => {
  // Remove all non-numeric characters
  const numbers = cnpj.replace(/\D/g, '')
  // CNPJ must have 14 digits
  if (numbers.length !== 14) return cnpj
  // Format: XX.XXX.XXX/XXXX-XX
  return numbers.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

// Validate CNPJ format (basic validation)
const validateCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, '')
  return numbers.length === 14
}

// Form schema
const formSchema = z.object({
  cnpj: z.string().optional(),
  empresa_nome: z.string().optional(),
  nome_fantasia: z.string().optional(),
  descricao: z
    .string()
    .min(1, { message: 'Descrição da empresa é obrigatória.' })
    .min(10, { message: 'Descrição deve ter pelo menos 10 caracteres.' }),
  logo_url: z
    .string()
    .min(1, { message: 'URL da imagem é obrigatória.' })
    .url({ message: 'Deve ser uma URL válida.' }),
})

type FormData = z.infer<typeof formSchema>

interface NewEmpresaFormProps {
  initialData?: Partial<FormData>
  isReadOnly?: boolean
  onSubmit?: (data: FormData) => void
  onFormChangesDetected?: (hasChanges: boolean) => void
}

export function NewEmpresaForm({
  initialData,
  isReadOnly = false,
  onSubmit,
  onFormChangesDetected,
}: NewEmpresaFormProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchedCompany, setSearchedCompany] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      cnpj: '',
      empresa_nome: '',
      nome_fantasia: '',
      descricao: '',
      logo_url: '',
    },
    mode: 'onChange',
  })

  // Handle CNPJ input formatting
  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value)
    form.setValue('cnpj', formatted)
  }

  // Handle CNPJ search
  const handleSearchCNPJ = async () => {
    const cnpj = form.getValues('cnpj')
    if (!cnpj) {
      toast.error('Por favor, insira um CNPJ')
      return
    }

    if (!validateCNPJ(cnpj)) {
      toast.error('CNPJ inválido. Por favor, insira um CNPJ válido.')
      return
    }

    setIsSearching(true)
    try {
      // TODO: Implement API call to search company by CNPJ
      // For now, using mock data
      const cnpjNumbers = cnpj.replace(/\D/g, '')
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock response - replace with actual API call
      const mockCompanyName = 'Petróleo Brasileiro S.A' // This would come from API
      const mockNomeFantasia = 'PETROBRAS' // This would come from API
      
      setSearchedCompany(mockCompanyName)
      form.setValue('empresa_nome', mockCompanyName)
      form.setValue('nome_fantasia', mockNomeFantasia)
      
      toast.success('Empresa encontrada!')
    } catch (error) {
      console.error('Error searching CNPJ:', error)
      toast.error('Erro ao buscar empresa. Tente novamente.')
      setSearchedCompany(null)
      form.setValue('empresa_nome', '')
      form.setValue('nome_fantasia', '')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (data: FormData) => {
    if (!data.empresa_nome) {
      toast.error('Por favor, pesquise e selecione uma empresa pelo CNPJ')
      return
    }

    if (!data.descricao || data.descricao.trim() === '') {
      toast.error('Por favor, preencha a descrição da empresa')
      return
    }

    if (!data.logo_url || data.logo_url.trim() === '') {
      toast.error('Por favor, informe a URL da imagem do logo')
      return
    }

    console.log('Form submitted:', data)
    if (onSubmit) {
      onSubmit(data)
    }
  }

  // Watch form values to enable/disable submit button
  const descricao = form.watch('descricao')
  const logoUrl = form.watch('logo_url')
  
  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }
  
  const isFormValid =
    searchedCompany &&
    descricao &&
    descricao.trim().length >= 10 &&
    logoUrl &&
    logoUrl.trim() !== '' &&
    isValidUrl(logoUrl)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* CNPJ Search Section */}
        <div className="space-y-4">
          <FormLabel>Insira um CNPJ válido</FormLabel>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="000.000.000/0000-00"
                      {...field}
                      onChange={e => {
                        handleCNPJChange(e.target.value)
                      }}
                      disabled={isReadOnly || isSearching}
                      maxLength={18}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              onClick={handleSearchCNPJ}
              disabled={isReadOnly || isSearching}
              className="min-w-[120px]"
            >
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? 'Pesquisando...' : 'Pesquisar'}
            </Button>
          </div>
        </div>

        {/* Company Information Section */}
        {searchedCompany && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Empresa correspondente</h3>
            <FormField
              control={form.control}
              name="empresa_nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      className="bg-muted"
                      disabled={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nome_fantasia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome fantasia</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      className="bg-muted"
                      disabled={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Company Description */}
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição da empresa*</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[120px]"
                  placeholder="Descreva a empresa..."
                  {...field}
                  disabled={isReadOnly}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Company Logo */}
        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => {
            const logoUrl = field.value
            const isValidUrl =
              logoUrl &&
              logoUrl.trim() !== '' &&
              (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'))

            return (
              <FormItem>
                <FormLabel>Imagem de logo da empresa*</FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <Input
                      type="url"
                      placeholder="URL da imagem"
                      {...field}
                      onChange={e => {
                        field.onChange(e)
                        setImageError(false)
                      }}
                      disabled={isReadOnly}
                    />
                    {isValidUrl && (
                      <div className="relative rounded-lg border p-4 bg-muted/50">
                        {!imageError ? (
                          <img
                            src={logoUrl}
                            alt="Preview do logo"
                            className="max-h-[200px] max-w-full rounded-lg object-contain mx-auto"
                            onError={() => setImageError(true)}
                            onLoad={() => setImageError(false)}
                          />
                        ) : (
                          <div className="text-sm text-destructive text-center py-4">
                            Erro ao carregar imagem. Verifique se a URL está
                            correta.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isReadOnly}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isReadOnly || !isFormValid}>
            Cadastrar empresa
          </Button>
        </div>
      </form>
    </Form>
  )
}
