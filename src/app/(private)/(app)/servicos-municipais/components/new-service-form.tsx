'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SECRETARIAS } from '@/lib/secretarias'
import { toast } from 'sonner'

// Define the schema for service form validation
const serviceFormSchema = z.object({
  managingOrgan: z.string().min(1, { message: 'Órgão gestor é obrigatório.' }),
  serviceCategory: z
    .string()
    .min(1, { message: 'Categoria do serviço é obrigatória.' }),
  targetAudience: z
    .string()
    .min(1, { message: 'Público específico é obrigatório.' }),
  title: z
    .string()
    .min(1, { message: 'Título do serviço é obrigatório.' })
    .min(3, { message: 'Título deve ter pelo menos 3 caracteres.' })
    .max(200, { message: 'Título não pode exceder 200 caracteres.' }),
  shortDescription: z
    .string()
    .min(1, { message: 'Descrição resumida é obrigatória.' })
    .min(10, {
      message: 'Descrição resumida deve ter pelo menos 10 caracteres.',
    })
    .max(500, {
      message: 'Descrição resumida não pode exceder 500 caracteres.',
    }),
  whatServiceDoesNotCover: z
    .string()
    .max(300, { message: 'Este campo não pode exceder 300 caracteres.' })
    .optional(),
  serviceTime: z
    .string()
    .max(100, {
      message: 'Tempo para atendimento não pode exceder 100 caracteres.',
    })
    .optional(),
  serviceCost: z
    .string()
    .max(100, { message: 'Custo do serviço não pode exceder 100 caracteres.' })
    .optional(),
  isFree: z.boolean().optional(),
  requestResult: z
    .string()
    .max(500, {
      message: 'Resultado da solicitação não pode exceder 500 caracteres.',
    })
    .optional(),
  fullDescription: z
    .string()
    .max(2000, {
      message: 'Descrição completa não pode exceder 2000 caracteres.',
    })
    .optional(),
  requiredDocuments: z
    .string()
    .max(1000, {
      message: 'Documentos necessários não pode exceder 1000 caracteres.',
    })
    .optional(),
  instructionsForRequester: z
    .string()
    .max(1000, {
      message:
        'Instruções para o solicitante não pode exceder 1000 caracteres.',
    })
    .optional(),
  digitalChannels: z
    .array(z.string().url({ message: 'URL inválida.' }))
    .optional(),
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

const defaultValues: ServiceFormData = {
  managingOrgan: '',
  serviceCategory: '',
  targetAudience: '',
  title: '',
  shortDescription: '',
  whatServiceDoesNotCover: '',
  serviceTime: '',
  serviceCost: '',
  isFree: false,
  requestResult: '',
  fullDescription: '',
  requiredDocuments: '',
  instructionsForRequester: '',
  digitalChannels: [],
}

interface NewServiceFormProps {
  onSubmit?: (data: ServiceFormData) => void
  isLoading?: boolean
}

export function NewServiceForm({
  onSubmit,
  isLoading = false,
}: NewServiceFormProps) {
  const router = useRouter()
  const [showSendToEditDialog, setShowSendToEditDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [pendingFormData, setPendingFormData] =
    useState<ServiceFormData | null>(null)
  const [digitalChannels, setDigitalChannels] = useState<string[]>([''])
  const [channelErrors, setChannelErrors] = useState<string[]>([''])

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues,
  })

  const handleCancel = () => {
    router.push('/servicos-municipais/servicos')
  }

  const addDigitalChannel = () => {
    setDigitalChannels([...digitalChannels, ''])
    setChannelErrors([...channelErrors, ''])
  }

  const removeDigitalChannel = (index: number) => {
    if (digitalChannels.length > 1) {
      const newChannels = digitalChannels.filter((_, i) => i !== index)
      const newErrors = channelErrors.filter((_, i) => i !== index)
      setDigitalChannels(newChannels)
      setChannelErrors(newErrors)
      form.setValue(
        'digitalChannels',
        newChannels.filter(channel => channel.trim() !== '')
      )
    }
  }

  const updateDigitalChannel = (index: number, value: string) => {
    const newChannels = [...digitalChannels]
    const newErrors = [...channelErrors]

    newChannels[index] = value

    // Validate URL
    if (value.trim() !== '') {
      try {
        new URL(value)
        newErrors[index] = ''
      } catch {
        newErrors[index] = 'URL inválida'
      }
    } else {
      newErrors[index] = ''
    }

    setDigitalChannels(newChannels)
    setChannelErrors(newErrors)

    // Only include valid URLs in form data
    const validChannels = newChannels
      .filter(channel => channel.trim() !== '')
      .filter(channel => {
        try {
          new URL(channel)
          return true
        } catch {
          return false
        }
      })

    form.setValue('digitalChannels', validChannels)
  }

  const handleSendToEditClick = (data: ServiceFormData) => {
    const processedData = preprocessFormData(data)
    setPendingFormData(processedData)
    setShowSendToEditDialog(true)
  }

  const handlePublishClick = (data: ServiceFormData) => {
    const processedData = preprocessFormData(data)
    setPendingFormData(processedData)
    setShowPublishDialog(true)
  }

  const handleConfirmSendToEdit = async () => {
    if (!pendingFormData) return

    try {
      console.log('Enviando serviço para edição:', pendingFormData)
      // TODO: Implementar função de enviar para edição
      toast.success('Serviço enviado para edição!')
      setPendingFormData(null)
    } catch (error) {
      console.error('Error sending service to edit:', error)
      toast.error('Erro ao enviar serviço para edição. Tente novamente.')
    }
  }

  const handleConfirmPublish = async () => {
    if (!pendingFormData) return

    try {
      console.log('Publicando serviço:', pendingFormData)
      // TODO: Implementar função de publicar serviço
      toast.success('Serviço publicado com sucesso!')
      setPendingFormData(null)
    } catch (error) {
      console.error('Error publishing service:', error)
      toast.error('Erro ao publicar serviço. Tente novamente.')
    }
  }

  const preprocessFormData = (data: ServiceFormData): ServiceFormData => {
    // Filter out empty and invalid digital channels
    const validChannels = digitalChannels
      .filter(channel => channel.trim() !== '')
      .filter(channel => {
        try {
          new URL(channel)
          return true
        } catch {
          return false
        }
      })

    return {
      ...data,
      digitalChannels: validChannels.length > 0 ? validChannels : undefined,
    }
  }

  const handleSubmit = async (data: ServiceFormData) => {
    try {
      const processedData = preprocessFormData(data)
      console.log('Service form data:', processedData)

      if (onSubmit) {
        await onSubmit(processedData)
      } else {
        // Default behavior - show success message
        toast.success('Serviço criado com sucesso!')
        form.reset()
      }
    } catch (error) {
      console.error('Error creating service:', error)
      toast.error('Erro ao criar serviço. Tente novamente.')
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="managingOrgan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão gestor*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o órgão gestor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECRETARIAS.map(secretaria => (
                          <SelectItem
                            key={secretaria.value}
                            value={secretaria.value}
                          >
                            {secretaria.label}
                            {secretaria.sigla ? ` - ${secretaria.sigla}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria do serviço*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria do serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="educacao">Educação</SelectItem>
                        <SelectItem value="cidade">Cidade</SelectItem>
                        <SelectItem value="transporte">Transporte</SelectItem>
                        <SelectItem value="licencas">Licenças</SelectItem>
                        <SelectItem value="animais">Animais</SelectItem>
                        <SelectItem value="ambiente">Ambiente</SelectItem>
                        <SelectItem value="saude">Saúde</SelectItem>
                        <SelectItem value="cidadania">Cidadania</SelectItem>
                        <SelectItem value="familia">Família</SelectItem>
                        <SelectItem value="taxas">Taxas</SelectItem>
                        <SelectItem value="servidor">Servidor</SelectItem>
                        <SelectItem value="cultura">Cultura</SelectItem>
                        <SelectItem value="seguranca">Segurança</SelectItem>
                        <SelectItem value="ouvidoria">Ouvidoria</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público específico*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o público específico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="geral">Público em geral</SelectItem>
                        <SelectItem value="criancas">Crianças</SelectItem>
                        <SelectItem value="adolescentes">
                          Adolescentes
                        </SelectItem>
                        <SelectItem value="jovens">Jovens</SelectItem>
                        <SelectItem value="adultos">Adultos</SelectItem>
                        <SelectItem value="idosos">Idosos</SelectItem>
                        <SelectItem value="mulheres">Mulheres</SelectItem>
                        <SelectItem value="pcd">
                          Pessoas com Deficiência
                        </SelectItem>
                        <SelectItem value="empresarios">Empresários</SelectItem>
                        <SelectItem value="estudantes">Estudantes</SelectItem>
                        <SelectItem value="profissionais">
                          Profissionais
                        </SelectItem>
                        <SelectItem value="familias">Famílias</SelectItem>
                        <SelectItem value="vulnerabilidade">
                          Pessoas em situação de vulnerabilidade
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do serviço*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do serviço municipal"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição resumida do serviço*</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Descreva resumidamente o serviço oferecido"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatServiceDoesNotCover"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O que o serviço não cobre</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Não atende casos emergenciais"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo para atendimento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 5 dias úteis, Imediato, 30 dias"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo do serviço (se houver)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: R$ 50,00, Taxa municipal"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Serviço gratuito</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="requestResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado da solicitação</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Descreva o que o cidadão receberá após a solicitação"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição completa do serviço</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
                        placeholder="Descrição detalhada do serviço, seus objetivos e benefícios"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredDocuments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documentos necessários</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Liste os documentos necessários para solicitar o serviço"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructionsForRequester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções para o solicitante</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Instruções passo a passo para o cidadão"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Digital Channels Section */}
              <div className="space-y-4">
                <div>
                  <FormLabel
                    className={
                      channelErrors.some(error => error)
                        ? 'text-destructive'
                        : ''
                    }
                  >
                    Canais digitais
                  </FormLabel>
                  <div className="space-y-3 mt-2">
                    {digitalChannels.map((channel, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Input
                              placeholder="http://exemplo.com"
                              value={channel}
                              onChange={e =>
                                updateDigitalChannel(index, e.target.value)
                              }
                              disabled={isLoading}
                              className={
                                channelErrors[index] ? 'border-destructive' : ''
                              }
                            />
                            {channelErrors[index] && (
                              <p className="text-sm text-destructive mt-1">
                                {channelErrors[index]}
                              </p>
                            )}
                          </div>
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeDigitalChannel(index)}
                              disabled={isLoading}
                              className="shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addDigitalChannel}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Adicionar campo adicional +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-6">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={form.handleSubmit(handleSendToEditClick)}
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar para edição'}
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={form.handleSubmit(handlePublishClick)}
              disabled={isLoading}
            >
              {isLoading ? 'Publicando...' : 'Publicar serviço'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Modal de confirmação para enviar para edição */}
      <ConfirmDialog
        open={showSendToEditDialog}
        onOpenChange={setShowSendToEditDialog}
        title="Enviar para edição"
        description="Tem certeza que deseja enviar este serviço para edição? Ele ficará disponível para o grupo editor revisar e fazer ajustes necessários."
        confirmText="Enviar para edição"
        cancelText="Cancelar"
        variant="default"
        onConfirm={handleConfirmSendToEdit}
      />

      {/* Modal de confirmação para publicar serviço */}
      <ConfirmDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        title="Publicar serviço"
        description="Tem certeza que deseja publicar este serviço? Ele ficará disponível no pref.rio para todos os cidadãos."
        confirmText="Publicar serviço"
        cancelText="Cancelar"
        variant="default"
        onConfirm={handleConfirmPublish}
      />
    </div>
  )
}
