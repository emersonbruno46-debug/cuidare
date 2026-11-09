// ─────────────────────────────────────────────
// CUIDARE — Conexão com o Supabase
// O endereço e a chave pública vêm do arquivo .env (ou das configurações da Vercel).
// ─────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// import.meta.env não existe quando os testes rodam fora do navegador
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

let client: SupabaseClient | null = null;

/** Cliente único do Supabase. Só é criado na primeira vez que alguém precisa dele. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return client;
}

/** Traduz os erros do banco para mensagens que a equipe entende. */
export function friendlyDbError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return 'Erro desconhecido.';
  switch (error.code) {
    case '23P01':
      return 'Horário indisponível: já existe um agendamento para esta profissional nesse horário.';
    case '23514':
      if (error.message?.includes('cancelamento_exige_motivo')) return 'Informe o motivo do cancelamento.';
      return 'Algum dado está fora do permitido. Confira os campos e tente de novo.';
    case '23505':
      return 'Este registro já existe.';
    case '42501':
      return 'Você não tem permissão para esta ação.';
    case 'PGRST116':
      return 'Registro não encontrado ou sem permissão.';
    default:
      if (error.message?.includes('Failed to fetch')) return 'Sem conexão com a internet. Tente de novo.';
      return error.message || 'Não foi possível salvar. Tente de novo.';
  }
}
