// ─────────────────────────────────────────────
// CUIDARE — Login da equipe (Supabase Auth)
//
// A senha é conferida pelo Supabase, nunca pelo site.
// Depois do login, o papel (admin / colaboradora) vem da tabela staff_members.
// ─────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import type { AuthUser, AuthSession, UserRole } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';

interface AuthState {
  ready: boolean;          // já sabemos se há alguém logado?
  user: AuthUser | null;
}

let state: AuthState = { ready: !isSupabaseConfigured, user: null };
const listeners = new Set<() => void>();
let initStarted = false;

function setState(next: AuthState) {
  state = next;
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Busca o cadastro da pessoa na equipe. Sem cadastro ativo = sem acesso ao painel. */
async function loadStaffUser(userId: string, email: string): Promise<AuthUser | null> {
  const { data, error } = await getSupabase()
    .from('staff_members')
    .select('user_id, name, email, role, professional_id, active')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data || !data.active) return null;
  return {
    id: data.user_id,
    email: data.email || email,
    name: data.name,
    role: data.role as UserRole,
    professionalId: data.professional_id ?? undefined
  };
}

/** Liga o acompanhamento do login. Chamado uma vez quando o site abre. */
export function initAuth(): void {
  if (initStarted || !isSupabaseConfigured) return;
  initStarted = true;
  const supabase = getSupabase();

  const handle = async (userId: string | undefined, email: string | undefined) => {
    if (!userId) {
      setState({ ready: true, user: null });
      return;
    }
    const user = await loadStaffUser(userId, email ?? '');
    setState({ ready: true, user });
  };

  supabase.auth.getSession().then(({ data }) => {
    handle(data.session?.user.id, data.session?.user.email);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      setState({ ready: true, user: null });
    } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      // Fora do callback, como o Supabase recomenda, para não travar o login
      setTimeout(() => handle(session?.user.id, session?.user.email), 0);
    }
  });
}

/** Para componentes React: atualiza a tela quando alguém entra ou sai. */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured) return { user: null, error: 'Sistema de login não configurado.' };
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? '';
    if (msg.includes('invalid login')) return { user: null, error: 'E-mail ou senha incorretos.' };
    if (msg.includes('email not confirmed')) return { user: null, error: 'E-mail ainda não confirmado. Fale com a administração.' };
    return { user: null, error: 'Não foi possível entrar. Verifique sua internet e tente de novo.' };
  }

  const user = await loadStaffUser(data.user.id, data.user.email ?? email);
  if (!user) {
    await supabase.auth.signOut();
    return { user: null, error: 'Seu acesso ao painel não está ativo. Fale com a administração.' };
  }
  setState({ ready: true, user });
  return { user, error: null };
}

export async function signOut(): Promise<void> {
  setState({ ready: true, user: null });
  if (isSupabaseConfigured) await getSupabase().auth.signOut();
}

/** Troca a senha de quem está logado. */
export async function updateMyPassword(newPassword: string): Promise<string | null> {
  if (newPassword.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) {
    if (error.message.toLowerCase().includes('different')) return 'A nova senha precisa ser diferente da atual.';
    return 'Não foi possível trocar a senha. Tente de novo.';
  }
  return null;
}

export function getSession(): AuthSession | null {
  return state.user ? { user: state.user, expiresAt: Number.MAX_SAFE_INTEGER } : null;
}

export function getCurrentUser(): AuthUser | null {
  return state.user;
}

export function isAuthenticated(): boolean {
  return state.user !== null;
}
