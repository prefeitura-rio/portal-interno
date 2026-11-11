'use client'

import {
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { UseFormReturn } from 'react-hook-form'
import type { RedirectFormValues } from '../lib/redirects-utils'

interface RedirectFormFieldsProps {
  form: UseFormReturn<RedirectFormValues>
  canonicalHosts: readonly string[]
}

export function RedirectFormFields({
  form,
  canonicalHosts,
}: RedirectFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="host"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Host</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full font-mono">
                  <SelectValue placeholder="Selecione o host" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {canonicalHosts.map(host => (
                  <SelectItem key={host} value={host} className="font-mono">
                    {host}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="path"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Caminho</FormLabel>
              <FormControl>
                <Input
                  placeholder="/hc/pt-br/p/ouvidoria"
                  className="font-mono"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="match_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="exact">Exato</SelectItem>
                  <SelectItem value="prefix">Prefixo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="destination"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Destino</FormLabel>
            <FormControl>
              <Input
                placeholder="https://pref.rio/ouvidoria"
                className="font-mono"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="status_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={val => field.onChange(val === '301' ? 301 : 302)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="302">302 · Temporário</SelectItem>
                  <SelectItem value="301">301 · Permanente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-col justify-end">
              <FormLabel>Ativa</FormLabel>
              <div className="flex h-9 items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">
                  {field.value ? 'Sim' : 'Não'}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas (opcional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Observações sobre esta regra"
                rows={2}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
