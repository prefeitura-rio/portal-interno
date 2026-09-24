import type {
  EmpregabilidadeBancoCurriculoDetalhe,
  EmpregabilidadeCurriculoConquista,
  EmpregabilidadeCurriculoCursoComplementar,
  EmpregabilidadeCurriculoExperiencia,
  EmpregabilidadeCurriculoFormacao,
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
  const completo = curriculo.curriculo
  const formacoes = completo?.formacoes ?? []
  const experiencias = completo?.experiencias ?? []
  const conquistas = completo?.conquistas ?? []
  const cursos = completo?.cursos_complementares ?? []
  const idiomas = completo?.idiomas ?? []
  const resumo = sanitizeRmiValue(completo?.resumo_profissional)
  const temNomeSocial = !!sanitizeRmiValue(curriculo.nome_social)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {nomeDeExibicao(curriculo)}
        </h2>
        <div className="flex flex-col gap-1 rounded-md border bg-muted/50 px-4 py-3 text-sm sm:flex-row sm:gap-8">
          <span>
            Data de inclusão:{' '}
            <span className="font-medium">
              {formatDateBR(curriculo.data_inclusao) || NAO_INFORMADO}
            </span>
          </span>
          <span>
            Última atualização:{' '}
            <span className="font-medium">
              {formatDateBR(curriculo.data_atualizacao) || NAO_INFORMADO}
            </span>
          </span>
        </div>
      </div>

      <Secao titulo="Informações gerais">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <Dado rotulo="Idade" valor={formatarIdade(curriculo.idade)} />
          <Dado rotulo="Celular" valor={formatarCelular(curriculo.celular)} />
          <Dado rotulo="E-mail" valor={valorOuNaoInformado(curriculo.email)} />
          <Dado
            rotulo="Identidade"
            valor={valorOuNaoInformado(curriculo.genero)}
          />
          <Dado rotulo="Raça" valor={valorOuNaoInformado(curriculo.raca)} />
          <Dado
            rotulo="PCD"
            valor={valorOuNaoInformado(curriculo.deficiencia)}
          />
        </dl>
      </Secao>

      <Secao titulo="Formação">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dado
            rotulo="Escolaridade"
            valor={valorOuNaoInformado(curriculo.escolaridade)}
          />
        </dl>
        {formacoes.length > 0 && (
          <div className="space-y-3">
            {formacoes.map((formacao, index) => (
              <BlocoFormacao key={formacao.id ?? index} formacao={formacao} />
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Resumo profissional">
        {resumo ? (
          <p className="whitespace-pre-line text-sm">{resumo}</p>
        ) : (
          <NaoInformado />
        )}
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

      <Secao titulo="Conquistas e certificados">
        {conquistas.length === 0 && cursos.length === 0 ? (
          <NaoInformado />
        ) : (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {conquistas.map((conquista, index) => (
              <ItemConquista
                key={conquista.id ?? `conquista-${index}`}
                conquista={conquista}
              />
            ))}
            {cursos.map((curso, index) => (
              <ItemCurso key={curso.id ?? `curso-${index}`} curso={curso} />
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

function BlocoFormacao({
  formacao,
}: {
  formacao: EmpregabilidadeCurriculoFormacao
}) {
  const instituicao = sanitizeRmiValue(formacao.nome_instituicao)
  const detalhes = [
    sanitizeRmiValue(formacao.escolaridade?.descricao),
    sanitizeRmiValue(formacao.status),
    formacao.ano_conclusao ? `Conclusão em ${formacao.ano_conclusao}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-1 rounded-md border p-4">
      <p className="font-medium">
        {valorOuNaoInformado(formacao.nome_curso)}
        {instituicao && (
          <span className="font-normal text-muted-foreground">
            {' '}
            · {instituicao}
          </span>
        )}
      </p>
      {detalhes && <p className="text-sm text-muted-foreground">{detalhes}</p>}
    </div>
  )
}

function BlocoExperiencia({
  experiencia,
}: {
  experiencia: EmpregabilidadeCurriculoExperiencia
}) {
  // O formulário do cidadão pede a duração, não as datas de início e fim.
  const detalhes = [
    formatarTempoExperiencia(experiencia.tempo_experiencia_meses),
    experiencia.eh_trabalho_atual ? 'Trabalhando atualmente' : null,
    experiencia.experiencia_comprovada_ct ? 'Experiência em carteira' : null,
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
        {detalhes && (
          <p className="text-sm text-muted-foreground">{detalhes}</p>
        )}
      </div>
      {descricao && <p className="whitespace-pre-line text-sm">{descricao}</p>}
    </div>
  )
}

function ItemConquista({
  conquista,
}: {
  conquista: EmpregabilidadeCurriculoConquista
}) {
  const descricao = sanitizeRmiValue(conquista.descricao)

  return (
    <li>
      {valorOuNaoInformado(conquista.titulo)}
      {conquista.tipo_conquista?.descricao && (
        <span className="text-muted-foreground">
          {' '}
          ({conquista.tipo_conquista.descricao})
        </span>
      )}
      {descricao && <p className="text-muted-foreground">{descricao}</p>}
    </li>
  )
}

function ItemCurso({
  curso,
}: {
  curso: EmpregabilidadeCurriculoCursoComplementar
}) {
  const complemento = [
    sanitizeRmiValue(curso.nome_instituicao),
    curso.ano_conclusao || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li>
      {valorOuNaoInformado(curso.nome_curso)}
      <span className="text-muted-foreground"> (Curso complementar)</span>
      {complemento && <p className="text-muted-foreground">{complemento}</p>}
    </li>
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
