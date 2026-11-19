import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// Homologação PREF-536: o filtro "Idade" dos Filtros Avançados (Banco Geral de
// Currículos e candidatos da vaga) troca a idade mínima e máxima livres pelas
// opções fixas do critério de idade da vaga: Todos (sem filtro), Maiores de 18
// e Jovem Aprendiz (14 a 24 anos), em `faixa_etaria` na URL e na API.

const FILTRO_URL = new URL(
  '../../app/(private)/(app)/gorio/components/filtro-candidatos/filtro-candidatos.ts',
  import.meta.url
)

registerSrcLoader()
const {
  FILTRO_VAZIO,
  aplicarFiltroNaUrl,
  etiquetasDoFiltro,
  filtroDeParametros,
  filtroParaParametros,
  filtroVazio,
} = await import(FILTRO_URL.href)

describe('faixa etária do filtro de candidatos', () => {
  test('Todos não filtra por idade', () => {
    assert.deepEqual(filtroParaParametros(FILTRO_VAZIO), {})
    assert.equal(filtroVazio(FILTRO_VAZIO), true)
  })

  test('cada opção vira faixa_etaria na API', () => {
    assert.deepEqual(
      filtroParaParametros({ generos: [], faixaEtaria: 'maiores_de_18' }),
      { faixa_etaria: 'maiores_de_18' }
    )
    assert.deepEqual(
      filtroParaParametros({ generos: [], faixaEtaria: 'jovem_aprendiz' }),
      { faixa_etaria: 'jovem_aprendiz' }
    )
  })

  test('lê a opção da URL e ignora valor fora das opções', () => {
    const ler = (query: string) =>
      filtroDeParametros(new URLSearchParams(query)).faixaEtaria
    assert.equal(ler('faixa_etaria=jovem_aprendiz'), 'jovem_aprendiz')
    assert.equal(ler('faixa_etaria=maiores_de_18'), 'maiores_de_18')
    assert.equal(ler('faixa_etaria=30'), undefined)
    assert.equal(ler(''), undefined)
  })

  test('URL antiga com idade livre não vira filtro', () => {
    const filtro = filtroDeParametros(
      new URLSearchParams('idade_min=30&idade_max=40')
    )
    assert.equal(filtroVazio(filtro), true)
  })

  test('aplicar o filtro troca a faixa na URL e mantém os outros parâmetros', () => {
    const url = aplicarFiltroNaUrl(
      new URLSearchParams('page=2&faixa_etaria=maiores_de_18'),
      { generos: [], faixaEtaria: 'jovem_aprendiz' }
    )
    assert.equal(url.get('faixa_etaria'), 'jovem_aprendiz')
    assert.equal(url.get('page'), '2')

    const semIdade = aplicarFiltroNaUrl(url, FILTRO_VAZIO)
    assert.equal(semIdade.has('faixa_etaria'), false)
  })

  test('etiqueta com o nome da opção, removível', () => {
    const filtro = { generos: [], faixaEtaria: 'jovem_aprendiz' }
    const [etiqueta] = etiquetasDoFiltro(filtro, {})
    assert.equal(etiqueta.rotulo, 'Idade: Jovem Aprendiz')
    assert.equal(etiqueta.remover(filtro).faixaEtaria, undefined)

    const [maiores] = etiquetasDoFiltro(
      { generos: [], faixaEtaria: 'maiores_de_18' },
      {}
    )
    assert.equal(maiores.rotulo, 'Idade: Maiores de 18')
  })
})
