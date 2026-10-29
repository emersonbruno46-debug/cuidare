// ─────────────────────────────────────────────
// CUIDARE — Search & Normalization Utilities
// ─────────────────────────────────────────────

import type { Service } from '../types';

/**
 * Remove acentos, diacríticos, caracteres especiais e converte para minúsculas.
 * Exemplo: "Cílios" -> "cilios", "Maçã" -> "maca", "São Paulo" -> "sao paulo"
 */
export function normalizeText(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Dicionário de sinônimos/aliases comuns para enriquecer a experiência de busca dos clientes
 */
const CATEGORY_ALIASES: Record<string, string[]> = {
  escovas: ['escova', 'escovas', 'modelagem', 'secador', 'babyliss', 'cabelo'],
  penteados: ['penteado', 'penteados', 'ondas', 'tranca', 'coque', 'festa', 'formatura'],
  noivas: ['noiva', 'noivas', 'debutante', 'debutantes', 'casamento', 'dia da noiva', 'producao'],
  cursos: ['curso', 'cursos', 'aula', 'aprender', 'turma', 'iniciante', 'capacitacao', 'workshop'],
  tratamentos: ['tratamento', 'hidratacao', 'nutricao', 'reconstrucao', 'cronograma', 'terapia', 'cauterizacao', 'ozonioterapia'],
  quimicas: ['quimica', 'coloracao', 'mechas', 'luzes', 'tintura', 'retoque', 'alisamento', 'botox', 'progressiva', 'morena iluminada', 'loiro'],
  unhas: ['unha', 'unhas', 'manicure', 'pedicure', 'esmalte', 'esmaltacao', 'pes', 'maos', 'spa dos pes', 'francesinha'],
  sobrancelhas: ['sobrancelha', 'sobrancelhas', 'design', 'henna', 'olhar', 'pinco'],
  cilios: ['cilio', 'cilios', 'lash', 'extensao', 'alongamento', 'fio a fio', 'volume russo', 'olhar'],
  maquiagem: ['maquiagem', 'make', 'make up', 'social', 'pele', 'olhos', 'batom', 'blush'],
  estetica: ['estetica', 'massagem', 'drenagem', 'limpeza de pele', 'relaxante', 'depilacao', 'laser', 'corporal', 'facial']
};

/**
 * Verifica se um serviço atende aos termos de busca digitados.
 */
export function serviceMatchesQuery(service: Service, query: string): boolean {
  if (!query || query.trim() === '') return true;

  const normalizedQuery = normalizeText(query);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  const normalizedName = normalizeText(service.name);
  const normalizedDesc = normalizeText(service.description);
  const normalizedCat = normalizeText(service.category);
  const normalizedNote = normalizeText(service.note || '');

  const aliases = CATEGORY_ALIASES[service.category] || [];
  const normalizedAliases = aliases.map(normalizeText);

  // Cada token da busca deve estar presente em pelo menos um campo do serviço ou aliases da categoria
  return queryTokens.every(token => {
    return (
      normalizedName.includes(token) ||
      normalizedDesc.includes(token) ||
      normalizedCat.includes(token) ||
      normalizedNote.includes(token) ||
      normalizedAliases.some(alias => alias.includes(token))
    );
  });
}
