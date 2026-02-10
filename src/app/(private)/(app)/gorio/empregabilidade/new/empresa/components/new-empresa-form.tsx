'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Globe, Info, Search } from 'lucide-react'
import { toast } from 'sonner'

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
  // Campos opcionais adicionais
  website: z
    .string()
    .url({ message: 'Deve ser uma URL válida.' })
    .optional()
    .or(z.literal('')),
  setor: z.string().max(500).optional(),
  porte: z.string().max(100).optional(),
})

type FormData = z.infer<typeof formSchema>

interface NewEmpresaFormProps {
  initialData?: Partial<FormData>
  isReadOnly?: boolean
  isEditMode?: boolean // ← NEW: Flag to indicate edit mode
  onSubmit?: (data: FormData) => void
  onFormChangesDetected?: (hasChanges: boolean) => void
}

export function NewEmpresaForm({
  initialData,
  isReadOnly = false,
  isEditMode = false, // ← NEW: Default to false (create mode)
  onSubmit,
  onFormChangesDetected,
}: NewEmpresaFormProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchedCompany, setSearchedCompany] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [showStagingDialog, setShowStagingDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

  // Check if running in staging environment
  const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging'

  // ← NEW: Pre-populate searchedCompany in edit mode
  React.useEffect(() => {
    if (isEditMode && initialData?.empresa_nome) {
      setSearchedCompany(initialData.empresa_nome)
    }
  }, [isEditMode, initialData])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      cnpj: '',
      empresa_nome: '',
      nome_fantasia: '',
      descricao: '',
      logo_url: '',
      website: '',
      setor: '',
      porte: '',
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
      const cnpjNumbers = cnpj.replace(/\D/g, '')

      console.log('Searching CNPJ via RMI:', cnpjNumbers)

      const response = await fetch(
        `/api/empregabilidade/empresas/consulta-cnpj/${cnpjNumbers}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to search CNPJ')
      }

      const result = await response.json()
      console.log('CNPJ found:', result)

      const empresaData = result.empresa

      // Set searched company data
      setSearchedCompany(empresaData.razao_social || '')
      form.setValue('empresa_nome', empresaData.razao_social || '')
      form.setValue('nome_fantasia', empresaData.nome_fantasia || '')

      toast.success('Empresa encontrada na Receita Federal!')
    } catch (error) {
      console.error('Error searching CNPJ:', error)
      toast.error('Erro ao buscar empresa', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
      setSearchedCompany(null)
      form.setValue('empresa_nome', '')
      form.setValue('nome_fantasia', '')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (data: FormData) => {
    // Validate basic fields
    if (!data.descricao || data.descricao.trim() === '') {
      toast.error('Por favor, preencha a descrição da empresa')
      return
    }

    if (!data.logo_url || data.logo_url.trim() === '') {
      toast.error('Por favor, informe a URL da imagem do logo')
      return
    }

    // Check if empresa_nome is missing (CNPJ not searched)
    if (!data.empresa_nome) {
      // In staging, allow submission without CNPJ search with confirmation
      if (isStaging) {
        setPendingFormData(data)
        setShowStagingDialog(true)
        return
      }

      // In production, require CNPJ search
      toast.error('Por favor, pesquise e selecione uma empresa pelo CNPJ')
      return
    }

    console.log('Form submitted:', data)
    if (onSubmit) {
      onSubmit(data)
    }
  }

  const handleConfirmStagingSubmit = () => {
    if (pendingFormData && onSubmit) {
      setShowStagingDialog(false)
      onSubmit(pendingFormData)
      setPendingFormData(null)
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

  // In staging, allow form submission without CNPJ search
  const isFormValid = isStaging
    ? descricao &&
      descricao.trim().length >= 10 &&
      logoUrl &&
      logoUrl.trim() !== '' &&
      isValidUrl(logoUrl)
    : searchedCompany &&
      descricao &&
      descricao.trim().length >= 10 &&
      logoUrl &&
      logoUrl.trim() !== '' &&
      isValidUrl(logoUrl)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Card: Identificação da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Identificação da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CNPJ Search Section */}
            <div className="space-y-2">
              <FormLabel>CNPJ</FormLabel>
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="00.000.000/0000-00"
                          {...field}
                          onChange={e => {
                            handleCNPJChange(e.target.value)
                          }}
                          disabled={isReadOnly || isSearching || isEditMode}
                          readOnly={isEditMode}
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
                  disabled={isReadOnly || isSearching || isEditMode}
                  className="min-w-[120px]"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {isSearching ? 'Pesquisando...' : 'Pesquisar'}
                </Button>
              </div>
              {!isEditMode && (
                <p className="text-sm text-muted-foreground">
                  Insira um CNPJ válido e clique em Pesquisar para buscar os
                  dados da empresa na Receita Federal.
                </p>
              )}
            </div>

            {/* Company Information Section - Shown after CNPJ search or in edit mode */}
            {searchedCompany && (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="empresa_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
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
                      <FormLabel>Nome Fantasia</FormLabel>
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
          </CardContent>
        </Card>

        {/* Card: Informações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Description */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição*</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[120px]"
                      placeholder="Descreva a empresa, sua área de atuação, cultura organizacional..."
                      {...field}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormDescription>Mínimo de 10 caracteres</FormDescription>
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
                const isValidLogoUrl =
                  logoUrl &&
                  logoUrl.trim() !== '' &&
                  (logoUrl.startsWith('http://') ||
                    logoUrl.startsWith('https://'))

                return (
                  <FormItem>
                    <FormLabel>URL do Logo*</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="url"
                          placeholder="https://exemplo.com.br/logo.png"
                          {...field}
                          onChange={e => {
                            field.onChange(e)
                            setImageError(false)
                          }}
                          disabled={isReadOnly}
                        />
                        {isValidLogoUrl && (
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
          </CardContent>
        </Card>

        {/* Card: Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Setor */}
              <FormField
                control={form.control}
                name="setor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Tecnologia, Varejo, Indústria"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Porte */}
              <FormField
                control={form.control}
                name="porte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porte</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: MEI, ME, EPP, Médio, Grande"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Website */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.exemplo.com.br"
                      {...field}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

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
            {isEditMode ? 'Salvar alterações' : 'Cadastrar empresa'}
          </Button>
        </div>

        {/* Staging Environment Dialog */}
        <ConfirmDialog
          open={showStagingDialog}
          onOpenChange={setShowStagingDialog}
          title="Ambiente de Staging"
          description="Você está no ambiente de staging e não pesquisou o CNPJ na Receita Federal. Deseja continuar mesmo assim?"
          confirmText="Sim, continuar"
          cancelText="Cancelar"
          onConfirm={handleConfirmStagingSubmit}
          variant="default"
        />
      </form>
    </Form>
  )
}
