// ─────────────────────────────────────────────
// CUIDARE — Edge Function: criar acesso de alguém da equipe
//
// Roda no servidor do Supabase (não no navegador), porque criar contas exige
// a chave secreta service_role, que nunca pode ir para o site.
// Só uma administradora ativa consegue usar.
// ─────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Método não permitido.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Quem está pedindo? Precisa ser uma administradora ativa.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Faça login novamente.' });
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return reply(401, { error: 'Faça login novamente.' });

  const { data: callerStaff } = await admin
    .from('staff_members')
    .select('role, active')
    .eq('user_id', caller.user.id)
    .maybeSingle();
  if (!callerStaff || !callerStaff.active || callerStaff.role !== 'admin') {
    return reply(403, { error: 'Somente a administração pode criar acessos.' });
  }

  let body: {
    action?: string; userId?: string;
    email?: string; name?: string; role?: string; professionalId?: string; password?: string;
  };
  try { body = await req.json(); } catch { return reply(400, { error: 'Dados inválidos.' }); }

  // ── Ação: definir senha nova para alguém da equipe que esqueceu a sua
  if (body.action === 'redefinir_senha') {
    const userId = body.userId ?? '';
    const newPassword = body.password ?? '';
    if (newPassword.length < 8) return reply(400, { error: 'A senha precisa ter pelo menos 8 caracteres.' });
    const { data: member } = await admin.from('staff_members').select('user_id').eq('user_id', userId).maybeSingle();
    if (!member) return reply(404, { error: 'Pessoa não encontrada na equipe.' });
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (updateError) return reply(500, { error: 'Não foi possível definir a senha.' });
    return reply(200, { ok: true });
  }

  // ── Ação: criar acesso
  // 2. Dados da nova pessoa

  const email = (body.email ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim();
  const role = body.role === 'admin' ? 'admin' : 'collaborator';
  const professionalId = body.professionalId?.trim() || null;
  const password = body.password ?? '';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: 'E-mail inválido.' });
  if (name.length < 2) return reply(400, { error: 'Informe o nome.' });
  if (password.length < 8) return reply(400, { error: 'A senha inicial precisa ter pelo menos 8 caracteres.' });
  if (role === 'collaborator' && !professionalId) return reply(400, { error: 'Escolha a profissional.' });

  if (professionalId) {
    const { data: pro } = await admin.from('professionals').select('id').eq('id', professionalId).maybeSingle();
    if (!pro) return reply(400, { error: 'Profissional não encontrada.' });
    const { data: taken } = await admin.from('staff_members').select('user_id').eq('professional_id', professionalId).maybeSingle();
    if (taken) return reply(409, { error: 'Esta profissional já tem um acesso. Use o botão "Nova senha" no cadastro dela.' });
  }

  // 3. Cria a conta já confirmada (sem depender de e-mail)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });
  if (createError || !created.user) {
    const msg = createError?.message?.toLowerCase() ?? '';
    if (msg.includes('already') || msg.includes('registered')) return reply(409, { error: 'Já existe uma conta com este e-mail.' });
    return reply(500, { error: 'Não foi possível criar a conta.' });
  }

  // 4. Liga a conta ao papel no salão
  const { error: staffError } = await admin.from('staff_members').insert({
    user_id: created.user.id, name, email, role, professional_id: professionalId
  });
  if (staffError) {
    await admin.auth.admin.deleteUser(created.user.id); // desfaz para não deixar conta solta
    return reply(500, { error: 'Não foi possível vincular o acesso. Nada foi criado.' });
  }

  return reply(200, { ok: true, userId: created.user.id });
});
