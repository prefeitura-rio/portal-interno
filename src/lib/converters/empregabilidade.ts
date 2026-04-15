import type {
  InformacaoComplementar,
  InformacaoComplementarType,
} from '@/app/(private)/(app)/gorio/empregabilidade/components/informacoes-complementares-creator'
import type { EmpregabilidadeInformacaoComplementar } from '@/http-gorio/models/empregabilidadeInformacaoComplementar'
import type { EmpregabilidadeTipoCampo } from '@/http-gorio/models/empregabilidadeTipoCampo'
import { v4 as uuidv4 } from 'uuid'

/**
 * Mapeia tipos de campo do Frontend para tipos da API Gorio
 */
function mapTiposCampo(
  frontendType: InformacaoComplementarType
): EmpregabilidadeTipoCampo {
  const typeMap: Record<InformacaoComplementarType, EmpregabilidadeTipoCampo> =
    {
      text: 'resposta_curta',
      email: 'resposta_curta',
      date: 'resposta_curta',
      textarea: 'resposta_curta',
      number: 'resposta_numerica',
      radio: 'selecao_unica',
      select: 'selecao_unica',
      checkbox: 'selecao_multipla',
      multiselect: 'selecao_multipla',
    }

  return typeMap[frontendType]
}

/**
 * Mapeia tipos de campo da API Gorio para tipos do Frontend
 */
function mapTiposCampoReverse(
  apiType: EmpregabilidadeTipoCampo | undefined
): InformacaoComplementarType {
  if (!apiType) return 'text'

  const reverseTypeMap: Record<
    EmpregabilidadeTipoCampo,
    InformacaoComplementarType
  > = {
    resposta_curta: 'text',
    resposta_numerica: 'number',
    selecao_unica: 'select',
    selecao_multipla: 'multiselect',
  }

  return reverseTypeMap[apiType] || 'text'
}

/**
 * Converte campos de informação complementar do formato Frontend para o formato da API
 *
 * @param campos - Array de campos no formato do Frontend
 * @returns Array de campos no formato da API Gorio
 */
export function toApiInformacaoComplementar(
  campos: InformacaoComplementar[]
): EmpregabilidadeInformacaoComplementar[] {
  return campos.map(campo => {
    const apiCampo: EmpregabilidadeInformacaoComplementar = {
      titulo: campo.title,
      obrigatorio: campo.required,
      tipo_campo: mapTiposCampo(campo.field_type),
    }

    // Adiciona opções se o campo tem opções (e filtra valores vazios)
    if (campo.options && campo.options.length > 0) {
      const opcoesValidas = campo.options
        .map(opt => opt.value.trim())
        .filter(value => value.length > 0)

      if (opcoesValidas.length > 0) {
        apiCampo.opcoes = opcoesValidas
      }
    }

    // Adiciona valores min/max para campos numéricos
    if (campo.field_type === 'number') {
      if (campo.valor_min !== undefined && campo.valor_min !== null) {
        apiCampo.valor_minimo = campo.valor_min
      }
      if (campo.valor_max !== undefined && campo.valor_max !== null) {
        apiCampo.valor_maximo = campo.valor_max
      }
    }

    // Preserva o ID se existir (útil para edições)
    if (campo.id && !campo.id.startsWith('temp-')) {
      apiCampo.id = campo.id
    }

    return apiCampo
  })
}

/**
 * Converte campos de informação complementar do formato da API para o formato do Frontend
 *
 * @param apiCampos - Array de campos no formato da API Gorio
 * @returns Array de campos no formato do Frontend
 */
export function fromApiInformacaoComplementar(
  apiCampos: EmpregabilidadeInformacaoComplementar[] | undefined | null
): InformacaoComplementar[] {
  if (!apiCampos || !Array.isArray(apiCampos)) {
    return []
  }

  return apiCampos.map(campo => {
    const frontendCampo: InformacaoComplementar = {
      id: campo.id || uuidv4(),
      title: campo.titulo || '',
      required: campo.obrigatorio || false,
      field_type: mapTiposCampoReverse(campo.tipo_campo),
    }

    // Converte opções de array de strings para array de objetos com IDs
    if (
      campo.opcoes &&
      Array.isArray(campo.opcoes) &&
      campo.opcoes.length > 0
    ) {
      frontendCampo.options = campo.opcoes.map((opcao: string) => ({
        id: uuidv4(),
        value: opcao,
      }))
    }

    // Adiciona valores min/max se existirem
    if (campo.valor_minimo !== undefined && campo.valor_minimo !== null) {
      frontendCampo.valor_min = campo.valor_minimo
    }
    if (campo.valor_maximo !== undefined && campo.valor_maximo !== null) {
      frontendCampo.valor_max = campo.valor_maximo
    }

    return frontendCampo
  })
}
