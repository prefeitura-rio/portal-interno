import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Archive, Calendar, FileText, User } from 'lucide-react'
import React from 'react'

interface TombadoServiceInfoProps {
  origem: string
  idServicoAntigo: string
  criadoEm?: number
  criadoPor?: string
  observacoes?: string
}

export function TombadoServiceInfo({
  origem,
  idServicoAntigo,
  criadoEm,
  criadoPor,
  observacoes,
}: TombadoServiceInfoProps) {
  const formatOrigem = (v: string): string => {
    if (!v) return '—'
    const s = v.toLowerCase()
    if (s.includes('1746')) return '1746'
    if (s.includes('carioca')) return 'Carioca Digital'
    return v
  }

  const formatDate = (ts?: number): string | null => {
    if (!ts) return null
    try {
      return format(new Date(ts * 1000), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return null
    }
  }

  const formattedDate = formatDate(criadoEm)

  return (
    <Card className="border-l-8 py-3 border-l-emerald-500 border border-emerald-200/60 dark:border-emerald-900/40 bg-white dark:bg-zinc-900/60 shadow-sm">
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tombamento" className="border-b-0">
            <AccordionTrigger
              className="px-4 sm:px-5 py-0 text-left hover:no-underline
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-t-lg"
            >
              <div className="flex w-full items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl
                                bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-200/60 dark:ring-emerald-900/50">
                  <Archive className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-none">
                    Informações de tombamento
                  </p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 sm:px-5 pb-4 pt-5">
              <div className="space-y-4">

                {/* linha principal: origem + id */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <Label>Origem</Label>
                  <Pill>{formatOrigem(origem)}</Pill>

                  <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                  <Label className="sm:ml-1">ID original</Label>
                  <Pill mono>{idServicoAntigo}</Pill>
                </div>

                {/* grid secundária: data + autor */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  {formattedDate && (
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Tombado em"
                      value={formattedDate}
                    />
                  )}
                  <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                  {criadoPor && (
                    <InfoRow
                      icon={<User className="h-4 w-4" />}
                      label="Por"
                      value={criadoPor}
                    />
                  )}
                </div>

                {/* observações */}
                {observacoes && (
                  <div className="pt-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                          Observações
                        </p>
                        <div
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800
                                     bg-zinc-50/70 dark:bg-zinc-900/40 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300
                                     leading-relaxed whitespace-pre-wrap"
                        >
                          {observacoes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

/** ——— UI helpers ——— */

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs uppercase tracking-wide font-semibold text-zinc-500 dark:text-zinc-400 ${className}`}>
      {children}
    </span>
  )
}

function Pill({
  children,
  mono = false,
}: {
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <span
      className={[
        "inline-flex max-w-full items-center gap-1 rounded-lg",
        "border border-emerald-200/60 dark:border-emerald-900/40",
        "bg-emerald-50/60 dark:bg-emerald-900/20",
        "px-2 py-1 text-xs text-emerald-800 dark:text-emerald-200",
        mono ? "font-mono tracking-tight" : "font-medium",
      ].join(' ')}
    >
      {children}
    </span>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="text-emerald-700 dark:text-emerald-300">{icon}</span>
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="truncate">
        <Pill mono>{value}</Pill>
      </span>
    </div>
  )
}
