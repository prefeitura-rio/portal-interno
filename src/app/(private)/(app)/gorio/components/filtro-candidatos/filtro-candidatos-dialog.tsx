'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIdiomas } from '@/hooks/use-idiomas'
import { useNiveisIdioma } from '@/hooks/use-niveis-idioma'
import { neighborhoodZone } from '@/lib/neighborhood_zone'
import { cn } from '@/lib/utils'
import { CheckIcon, ChevronsUpDownIcon, Filter, X } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import {
  ESCOLARIDADES,
  EXIGENCIAS_CARTEIRA,
  FAIXAS_EXPERIENCIA,
  FILTRO_VAZIO,
  type FiltroCandidatos,
  GENEROS,
  etiquetasDoFiltro,
} from './filtro-candidatos'

// Valor dos selects e radios que representa "sem filtro".
const QUALQUER = 'qualquer'

const BAIRROS = Array.from(new Set(neighborhoodZone.map(n => n.bairro))).sort(
  (a, b) => a.localeCompare(b, 'pt-BR')
)

interface FiltroCandidatosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filtro: FiltroCandidatos
  onAplicar: (filtro: FiltroCandidatos) => void
}

/**
 * Modal "Filtrar" dos filtros avançados de candidatos. Edita uma cópia do
 * filtro e só aplica ao confirmar.
 */
export function FiltroCandidatosDialog({
  open,
  onOpenChange,
  filtro,
  onAplicar,
}: FiltroCandidatosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <FormularioFiltro
          filtro={filtro}
          onCancelar={() => onOpenChange(false)}
          onAplicar={proximo => {
            onAplicar(proximo)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * O formulário só monta com o modal aberto: as tabelas de idioma são buscadas
 * só aí, e o rascunho parte sempre do filtro aplicado.
 */
function FormularioFiltro({
  filtro,
  onCancelar,
  onAplicar,
}: {
  filtro: FiltroCandidatos
  onCancelar: () => void
  onAplicar: (filtro: FiltroCandidatos) => void
}) {
  const [rascunho, setRascunho] = useState<FiltroCandidatos>(filtro)
  const { idiomas } = useIdiomas()
  const { niveisIdioma } = useNiveisIdioma()
  const niveisOrdenados = useMemo(
    () => [...niveisIdioma].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [niveisIdioma]
  )

  const idadeInvalida =
    rascunho.idadeMin != null &&
    rascunho.idadeMax != null &&
    rascunho.idadeMin > rascunho.idadeMax

  function alterar(parcial: Partial<FiltroCandidatos>) {
    setRascunho(atual => ({ ...atual, ...parcial }))
  }

  function alternarGenero(genero: string) {
    setRascunho(atual => ({
      ...atual,
      generos: atual.generos.includes(genero)
        ? atual.generos.filter(g => g !== genero)
        : [...atual.generos, genero],
    }))
  }

  return (
    <>
      <DialogHeader className="p-6 pb-4">
        <DialogTitle>Filtrar</DialogTitle>
        <DialogDescription>
          Quem não informou o dado filtrado fica de fora do resultado.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 overflow-y-auto px-6 pb-6">
        <Grupo titulo="Gênero">
          <div className="grid gap-2 sm:grid-cols-2">
            {GENEROS.map(genero => (
              <Label
                key={genero}
                className="flex items-center gap-2 font-normal"
              >
                <Checkbox
                  checked={rascunho.generos.includes(genero)}
                  onCheckedChange={() => alternarGenero(genero)}
                />
                {genero}
              </Label>
            ))}
          </div>
        </Grupo>

        <Grupo titulo="Idade">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Mínima"
              aria-label="Idade mínima"
              className="w-28"
              value={rascunho.idadeMin ?? ''}
              onChange={e => alterar({ idadeMin: lerIdade(e.target.value) })}
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Máxima"
              aria-label="Idade máxima"
              className="w-28"
              value={rascunho.idadeMax ?? ''}
              onChange={e => alterar({ idadeMax: lerIdade(e.target.value) })}
            />
          </div>
          {idadeInvalida && (
            <p className="text-sm text-destructive">
              A idade mínima não pode ser maior que a máxima.
            </p>
          )}
        </Grupo>

        <Grupo titulo="Tempo de experiência profissional">
          <OpcoesRadio
            valor={rascunho.tempoExperiencia}
            onChange={valor => alterar({ tempoExperiencia: valor })}
            opcoes={[
              { valor: QUALQUER, rotulo: 'Todos' },
              ...FAIXAS_EXPERIENCIA,
            ]}
          />
        </Grupo>

        <Grupo titulo="Experiência comprovada em carteira">
          <OpcoesRadio
            valor={rascunho.carteira}
            onChange={valor => alterar({ carteira: valor })}
            opcoes={[
              ...EXIGENCIAS_CARTEIRA,
              { valor: QUALQUER, rotulo: 'Não precisa' },
            ]}
          />
        </Grupo>

        <div className="grid gap-6 sm:grid-cols-2">
          <Grupo titulo="Escolaridade">
            <SelectSimples
              valor={rascunho.escolaridade}
              onChange={valor => alterar({ escolaridade: valor })}
              placeholder="Todas"
              opcoes={ESCOLARIDADES.map(e => ({ valor: e, rotulo: e }))}
            />
          </Grupo>

          <Grupo titulo="Bairro">
            <SelectBairro
              valor={rascunho.bairro}
              onChange={valor => alterar({ bairro: valor })}
            />
          </Grupo>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Grupo titulo="Idioma estrangeiro">
            <SelectSimples
              valor={rascunho.idIdioma}
              onChange={valor =>
                alterar({
                  idIdioma: valor,
                  idNivelIdioma: valor ? rascunho.idNivelIdioma : undefined,
                })
              }
              placeholder="Todos"
              opcoes={idiomas
                .filter(i => i.id)
                .map(i => ({ valor: i.id ?? '', rotulo: i.descricao ?? '' }))}
            />
          </Grupo>

          <Grupo titulo="Nível mínimo do idioma">
            <SelectSimples
              valor={rascunho.idNivelIdioma}
              onChange={valor => alterar({ idNivelIdioma: valor })}
              placeholder="Qualquer nível"
              desabilitado={!rascunho.idIdioma}
              opcoes={niveisOrdenados
                .filter(n => n.id)
                .map(n => ({
                  valor: n.id ?? '',
                  rotulo: `${n.descricao} ou acima`,
                }))}
            />
          </Grupo>
        </div>

        <Grupo titulo="Pessoa com deficiência">
          <OpcoesRadio
            valor={rascunho.pcd}
            onChange={valor =>
              alterar({ pcd: valor as FiltroCandidatos['pcd'] })
            }
            opcoes={[
              { valor: QUALQUER, rotulo: 'Todos' },
              { valor: 'sim', rotulo: 'Sim' },
              { valor: 'nao', rotulo: 'Não' },
            ]}
          />
        </Grupo>
      </div>

      <DialogFooter className="border-t p-4">
        <Button variant="ghost" onClick={() => setRascunho(FILTRO_VAZIO)}>
          Limpar campos
        </Button>
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button onClick={() => onAplicar(rascunho)} disabled={idadeInvalida}>
          Aplicar filtro
        </Button>
      </DialogFooter>
    </>
  )
}

interface FiltrosAplicadosProps {
  filtro: FiltroCandidatos
  onChange: (filtro: FiltroCandidatos) => void
}

/** Etiquetas do filtro aplicado, cada uma removível, e "Limpar filtro". */
export function FiltrosAplicados(props: FiltrosAplicadosProps) {
  // Só busca as tabelas de idioma quando há filtro de idioma para nomear.
  return props.filtro.idIdioma ? (
    <EtiquetasComNomeDoIdioma {...props} />
  ) : (
    <Etiquetas {...props} nomes={{}} />
  )
}

function EtiquetasComNomeDoIdioma(props: FiltrosAplicadosProps) {
  const { idiomas } = useIdiomas()
  const { niveisIdioma } = useNiveisIdioma()
  return (
    <Etiquetas
      {...props}
      nomes={{
        idioma: idiomas.find(i => i.id === props.filtro.idIdioma)?.descricao,
        nivelIdioma: niveisIdioma.find(n => n.id === props.filtro.idNivelIdioma)
          ?.descricao,
      }}
    />
  )
}

function Etiquetas({
  filtro,
  onChange,
  nomes,
}: FiltrosAplicadosProps & {
  nomes: { idioma?: string; nivelIdioma?: string }
}) {
  const etiquetas = etiquetasDoFiltro(filtro, nomes)
  if (etiquetas.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Filtro aplicado:</span>
      {etiquetas.map(etiqueta => (
        <Badge key={etiqueta.chave} variant="secondary" className="gap-1">
          {etiqueta.rotulo}
          <button
            type="button"
            onClick={() => onChange(etiqueta.remover(filtro))}
            aria-label={`Remover ${etiqueta.rotulo}`}
            className="rounded-sm hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="link" size="sm" onClick={() => onChange(FILTRO_VAZIO)}>
        Limpar filtro
      </Button>
    </div>
  )
}

/** Botão "Filtro" com a quantidade de filtros aplicados. */
export function BotaoFiltro({
  filtro,
  onClick,
}: {
  filtro: FiltroCandidatos
  onClick: () => void
}) {
  const quantidade = etiquetasDoFiltro(filtro, {}).length
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      <Filter className="mr-2 h-4 w-4" />
      Filtro
      {quantidade > 0 && (
        <Badge variant="secondary" className="ml-2">
          {quantidade}
        </Badge>
      )}
    </Button>
  )
}

function lerIdade(valor: string): number | undefined {
  if (valor.trim() === '') return undefined
  const n = Number(valor)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{titulo}</legend>
      {children}
    </fieldset>
  )
}

function OpcoesRadio({
  valor,
  onChange,
  opcoes,
}: {
  valor: string | undefined
  onChange: (valor: string | undefined) => void
  opcoes: { valor: string; rotulo: string }[]
}) {
  return (
    <RadioGroup
      value={valor ?? QUALQUER}
      onValueChange={v => onChange(v === QUALQUER ? undefined : v)}
      className="flex flex-wrap gap-x-5 gap-y-2"
    >
      {opcoes.map(opcao => (
        <Label
          key={opcao.valor}
          className="flex items-center gap-2 font-normal"
        >
          <RadioGroupItem value={opcao.valor} />
          {opcao.rotulo}
        </Label>
      ))}
    </RadioGroup>
  )
}

function SelectSimples({
  valor,
  onChange,
  opcoes,
  placeholder,
  desabilitado,
}: {
  valor: string | undefined
  onChange: (valor: string | undefined) => void
  opcoes: { valor: string; rotulo: string }[]
  placeholder: string
  desabilitado?: boolean
}) {
  return (
    <Select
      value={valor ?? QUALQUER}
      onValueChange={v => onChange(v === QUALQUER ? undefined : v)}
      disabled={desabilitado}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={QUALQUER}>{placeholder}</SelectItem>
        {opcoes.map(opcao => (
          <SelectItem key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Bairros do município do Rio, com busca. */
function SelectBairro({
  valor,
  onChange,
}: {
  valor: string | undefined
  onChange: (valor: string | undefined) => void
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <Popover open={aberto} onOpenChange={setAberto} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          className="w-full justify-between font-normal"
        >
          {valor ?? 'Todos'}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Buscar bairro" />
          <CommandList>
            <CommandEmpty>Nenhum bairro encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Todos"
                onSelect={() => {
                  onChange(undefined)
                  setAberto(false)
                }}
              >
                <CheckIcon
                  className={cn('mr-2 h-4 w-4', valor ? 'opacity-0' : '')}
                />
                Todos
              </CommandItem>
              {BAIRROS.map(bairro => (
                <CommandItem
                  key={bairro}
                  value={bairro}
                  onSelect={() => {
                    onChange(bairro)
                    setAberto(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      valor === bairro ? '' : 'opacity-0'
                    )}
                  />
                  {bairro}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
