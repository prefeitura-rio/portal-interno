'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
// Add new imports at the top of the file
import { CalendarIcon } from 'lucide-react'

// Update the formSchema to use z.date() for date fields
const formSchema = z
  .object({
    title: z.string().min(1, {
      message: 'Título é obrigatório.',
    }),
    description: z.string().min(1, {
      message: 'Descrição é obrigatória.',
    }),
    enrollmentStartDate: z.date({
      required_error: 'Data de início é obrigatória.',
    }),
    enrollmentEndDate: z.date({
      required_error: 'Data de término é obrigatória.',
    }),
    organization: z.string().min(1, {
      message: 'Órgão é obrigatório.',
    }),
  })
  .refine(data => data.enrollmentEndDate >= data.enrollmentStartDate, {
    message: 'A data final deve ser igual ou posterior à data inicial.',
    path: ['enrollmentEndDate'],
  })

export function NewCourseForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      enrollmentStartDate: undefined, // Change to undefined for date fields
      enrollmentEndDate: undefined, // Change to undefined for date fields
      organization: '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast('Formulário enviado com sucesso!', {
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-neutral-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
    console.log(values)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título*</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição*</FormLabel>
              <FormControl>
                <Textarea className="min-h-[120px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-end gap-4">
          <FormField
            control={form.control}
            name="enrollmentStartDate"
            render={({ field }) => (
              <FormItem className="flex flex-col flex-1">
                <FormLabel>Período de inscrições*</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy')
                        ) : (
                          <span>DD/MM/AAAA</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <span className="pb-2">à</span>
          <FormField
            control={form.control}
            name="enrollmentEndDate"
            render={({ field }) => (
              <FormItem className="flex flex-col flex-1">
                <FormLabel className="opacity-0 pointer-events-none select-none">
                  Data de término*
                </FormLabel>{' '}
                {/* Invisible label for spacing */}
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy')
                        ) : (
                          <span>DD/MM/AAAA</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="organization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Órgão (Quem oferece o curso)*</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um órgão" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="org1">Organização A</SelectItem>
                  <SelectItem value="org2">Organização B</SelectItem>
                  <SelectItem value="org3">Organização C</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Criar Curso</Button>
      </form>
    </Form>
  )
}
