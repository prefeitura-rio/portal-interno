import type {
  EmpregabilidadeBancoCurriculoDetalhe,
  EmpregabilidadeCurriculoExperiencia,
} from '@/http-gorio/models'
import { formatCPF } from '@/lib/cpf-validator'
import { formatDateBR } from '@/lib/format'
import { sanitizeRmiValue } from '@/lib/rmi-value'
import type { ReactNode } from 'react'
import {
  NAO_INFORMADO,
  formatarCelular,
  formatarIdade,
  formatarTempoExperiencia,
  nomeDeExibicao,
  valorOuNaoInformado,
} from '../lib/format'

interface FichaCurriculoProps {
  curriculo: EmpregabilidadeBancoCurriculoDetalhe
}

export function FichaCurriculo({ curriculo }: FichaCurriculoProps) {
  const experiencias = curriculo.curriculo?.experiencias ?? []
  const conquistas = curriculo.curriculo?.conquistas ?? []
  const idiomas = curriculo.curriculo?.idiomas ?? []
  const temNomeSocial = !!sanitizeRmiValue(curriculo.nome_social)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {nomeDeExibicao(curriculo)}
        </h2>
        <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm">
          Data de inclusão:{' '}
          <span className="font-medium">
            {formatDateBR(curriculo.data_inclusao) || NAO_INFORMADO}
          </span>
        </div>
      </div>

      <Secao titulo="Informações gerais">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {temNomeSocial && (
            <Dado
              rotulo="Nome civil"
              valor={valorOuNaoInformado(curriculo.nome)}
            />
          )}
          <Dado
            rotulo="CPF"
            valor={curriculo.cpf ? formatCPF(curriculo.cpf) : NAO_INFORMADO}
          />
          <Dado
            rotulo="Localização"
            valor={valorOuNaoInformado(curriculo.bairro)}
          />
          <Dado rotulo="Contato" valor={formatarCelular(curriculo.celular)} />
          <Dado
            rotulo="Identidade"
            valor={valorOuNaoInformado(curriculo.genero)}
          />
          <Dado rotulo="Idade" valor={formatarIdade(curriculo.idade)} />
        </dl>
      </Secao>

      <Secao titulo="Experiência profissional">
        {experiencias.length === 0 ? (
          <NaoInformado />
        ) : (
          <div className="space-y-3">
            {experiencias.map((experiencia, index) => (
              <BlocoExperiencia
                key={experiencia.id ?? index}
                experiencia={experiencia}
              />
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Qualificações">
        {conquistas.length === 0 ? (
          <NaoInformado />
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {conquistas.map((conquista, index) => (
              <li key={conquista.id ?? index}>
                {valorOuNaoInformado(conquista.titulo)}
                {conquista.tipo_conquista?.descricao && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({conquista.tipo_conquista.descricao})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Idiomas">
        {idiomas.length === 0 ? (
          <NaoInformado />
        ) : (
          <ul className="space-y-1 text-sm">
            {idiomas.map((idioma, index) => (
              <li key={idioma.id ?? index}>
                {valorOuNaoInformado(idioma.idioma?.descricao)}
                {idioma.nivel?.descricao && ` (${idioma.nivel.descricao})`}
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  )
}

function BlocoExperiencia({
  experiencia,
}: {
  experiencia: EmpregabilidadeCurriculoExperiencia
}) {
  const periodo = [
    formatarTempoExperiencia(experiencia.tempo_experiencia_meses),
    experiencia.eh_trabalho_atual ? 'Trabalhando atualmente' : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const descricao = sanitizeRmiValue(experiencia.descricao_atividades)

  return (
    <div className="space-y-2 rounded-md border p-4">
      <div>
        <p className="font-medium">
          {valorOuNaoInformado(experiencia.cargo)}
          {sanitizeRmiValue(experiencia.empresa) && (
            <span className="font-normal text-muted-foreground">
              {' '}
              · {experiencia.empresa}
            </span>
          )}
        </p>
        {periodo && <p className="text-sm text-muted-foreground">{periodo}</p>}
      </div>
      {descricao && <p className="whitespace-pre-line text-sm">{descricao}</p>}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium">{valor}</dd>
    </div>
  )
}

function NaoInformado() {
  return <p className="text-sm text-muted-foreground">{NAO_INFORMADO}</p>
}
