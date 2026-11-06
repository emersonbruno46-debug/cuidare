// ─────────────────────────────────────────────
// CUIDARE — Mock Auth (localStorage-based)
// Mirrors Supabase Auth patterns para fácil migração
// ─────────────────────────────────────────────

import type { AuthUser, AuthSession, UserRole } from '../types';

const SESSION_KEY = 'cuidare_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

// ── Simple hash (not cryptographic — for demo only)
// Quando migrar para Supabase: esta função é removida e usa supabase.auth.signInWithPassword
const mockHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
};

// ── Credentials store (localStorage: 'cuidare_accounts')
const ACCOUNTS_KEY = 'cuidare_accounts';

interface StoredAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  professionalId?: string;
  passwordHash: string;
  active: boolean;
}

function getAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ── Contas padrão
// As contas com senha de demonstração só existem no ambiente local (npm run dev).
// No build de produção esse trecho é removido pelo Vite, então nenhuma senha
// vai para o site publicado. O login real virá do Supabase Auth.
const REMOVED_EMAILS = new Set([
  'fernanda@cuidare.com.br',
  'rosy@cuidare.com.br',
  'geovanna@cuidare.com.br',
  'roberta@cuidare.com.br',
  'fabiana@cuidare.com.br',
  'tania@cuidare.com.br'
]);

export function seedDefaultAccounts(): void {
  const stored = getAccounts();

  // Remove contas de quem saiu da equipe (vale para todos os ambientes)
  const accounts = stored.filter(
    a => !REMOVED_EMAILS.has(a.email.toLowerCase()) && a.professionalId !== 'tania'
  );
  if (accounts.length !== stored.length) saveAccounts(accounts);

  if (!import.meta.env.DEV) return;

  const devAccounts: StoredAccount[] = [
    { id: 'user_admin_lane', email: 'lane@cuidare.com.br', name: 'Lane Viana', role: 'admin', passwordHash: mockHash('cuidare2024admin'), active: true },
    { id: 'user_evelyn', email: 'evelyn@cuidare.com.br', name: 'Evelyn', role: 'collaborator', professionalId: 'evelyn', passwordHash: mockHash('cuidare2024'), active: true },
    { id: 'user_railma', email: 'railma@cuidare.com.br', name: 'Railma', role: 'collaborator', professionalId: 'railma', passwordHash: mockHash('cuidare2024'), active: true },
    { id: 'user_maisa', email: 'maisa@cuidare.com.br', name: 'Maísa Rodrigues', role: 'collaborator', professionalId: 'maisa', passwordHash: mockHash('cuidare2024'), active: true },
    { id: 'user_fabiane', email: 'fabiane@cuidare.com.br', name: 'Fabiane', role: 'collaborator', professionalId: 'fabiane', passwordHash: mockHash('cuidare2024'), active: true },
    { id: 'user_lara', email: 'lara@cuidare.com.br', name: 'Lara', role: 'collaborator', professionalId: 'lara', passwordHash: mockHash('cuidare2024'), active: true }
  ];

  const missing = devAccounts.filter(d => !accounts.some(a => a.email === d.email));
  if (missing.length > 0) saveAccounts([...accounts, ...missing]);
}

// ── Auth functions

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const accounts = getAccounts();
  const account = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());

  if (!account || !account.active) {
    return { user: null, error: 'Usuário não encontrado ou inativo.' };
  }

  if (account.passwordHash !== mockHash(password)) {
    return { user: null, error: 'Senha incorreta.' };
  }

  const user: AuthUser = {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    professionalId: account.professionalId
  };

  const session: AuthSession = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { user, error: null };
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  return getSession()?.user ?? null;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// ── Account management (admin only)

export function listAccounts(): Omit<StoredAccount, 'passwordHash'>[] {
  return getAccounts().map(({ passwordHash: _ph, ...rest }) => rest);
}

export function createAccount(data: {
  email: string;
  name: string;
  role: UserRole;
  professionalId?: string;
  password: string;
}): { success: boolean; error?: string } {
  const accounts = getAccounts();
  if (accounts.find(a => a.email.toLowerCase() === data.email.toLowerCase())) {
    return { success: false, error: 'E-mail já cadastrado.' };
  }
  const newAccount: StoredAccount = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    email: data.email,
    name: data.name,
    role: data.role,
    professionalId: data.professionalId,
    passwordHash: mockHash(data.password),
    active: true
  };
  accounts.push(newAccount);
  saveAccounts(accounts);
  return { success: true };
}

export function updateAccountPassword(id: string, newPassword: string): boolean {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return false;
  accounts[idx].passwordHash = mockHash(newPassword);
  saveAccounts(accounts);
  return true;
}

export function toggleAccountActive(id: string): boolean {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return false;
  accounts[idx].active = !accounts[idx].active;
  saveAccounts(accounts);
  return true;
}
