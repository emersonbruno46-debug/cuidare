// ─────────────────────────────────────────────
// CUIDARE — Equipe e acessos (só administradora)
// Dados das profissionais e contas de acesso ao painel, gravados no Supabase.
// ─────────────────────────────────────────────

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, X, Check, Phone, UserCheck, UserX, KeyRound, ShieldCheck, UserPlus, UserMinus, RotateCcw } from 'lucide-react';
import type { Professional, UserRole, ServiceCategory } from '../../types';
import { CATEGORIES } from '../../data/categoriesData';
import {
  getProfessionals, updateProfessional, listStaff, setStaffActive, createStaffAccount, resetStaffPassword,
  createProfessional, removeProfessional, restoreProfessional, getUpcomingBookingsCount,
  useDataVersion, type StaffMember
} from '../../lib/dataService';
import { getCurrentUser } from '../../lib/auth';

const inputClass = 'w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]';
const labelClass = 'block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1';

export default function StaffManager() {
  useDataVersion();
  const allProfessionals = getProfessionals();
  const professionals = allProfessionals.filter(p => p.active !== false);
  const formerProfessionals = allProfessionals.filter(p => p.active === false);
  const staff = listStaff();
  const me = getCurrentUser();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Professional>>({});
  const [editError, setEditError] = useState('');
  const [saved, setSaved] = useState('');

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('collaborator');
  const [newProId, setNewProId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdMsg, setCreatedMsg] = useState('');

  const [resetFor, setResetFor] = useState<StaffMember | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const [showNewPro, setShowNewPro] = useState(false);
  const [removing, setRemoving] = useState<Professional | null>(null);

  const admins = staff.filter(s => s.role === 'admin');

  const startEdit = (pro: Professional) => {
    setEditingId(pro.id);
    setEditData({ ...pro });
    setEditError('');
  };

  const handleSave = async () => {
    if (!editingId) return;
    const result = await updateProfessional(editingId, {
      whatsapp: editData.whatsapp ?? '',
      photoUrl: editData.photoUrl ?? '',
      bio: editData.bio ?? '',
      commissionRate: editData.commissionRate
    });
    if (result.error) {
      setEditError(result.error);
      return;
    }
    setSaved(editingId);
    setEditingId(null);
    setTimeout(() => setSaved(''), 2000);
  };

  const handleCreateAccount = async () => {
    setCreateError('');
    setCreatedMsg('');
    const pro = professionals.find(p => p.id === newProId);
    const name = newRole === 'admin' ? newName.trim() : (pro?.name ?? '');
    if (!newEmail.trim() || !newPassword) { setCreateError('Preencha e-mail e senha inicial.'); return; }
    if (newRole === 'collaborator' && !newProId) { setCreateError('Escolha a profissional.'); return; }
    if (newRole === 'admin' && name.length < 2) { setCreateError('Informe o nome da administradora.'); return; }
    if (newPassword.length < 8) { setCreateError('A senha inicial precisa ter pelo menos 8 caracteres.'); return; }

    setCreating(true);
    const result = await createStaffAccount({
      email: newEmail.trim(),
      name,
      role: newRole,
      professionalId: newRole === 'collaborator' ? newProId : undefined,
      password: newPassword
    });
    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
      return;
    }
    setCreatedMsg(`Acesso criado para ${name}. Passe o e-mail e a senha inicial pessoalmente; no primeiro acesso, ela pode trocar a senha no menu "Trocar minha senha".`);
    setShowNewAccount(false);
    setNewEmail(''); setNewPassword(''); setNewProId(''); setNewName(''); setNewRole('collaborator');
  };

  // Abre o formulário de acesso já com a profissional escolhida e leva a tela até ele
  const accountFormRef = useRef<HTMLDivElement>(null);
  const openAccountFormFor = (professionalId: string) => {
    setNewRole('collaborator');
    setNewProId(professionalId);
    setNewEmail('');
    setNewPassword('');
    setCreateError('');
    setCreatedMsg('');
    setShowNewPro(false);
    setShowNewAccount(true);
    setTimeout(() => accountFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleRestore = async (pro: Professional) => {
    setActionError('');
    setActionMsg('');
    const result = await restoreProfessional(pro.id);
    if (result.error) { setActionError(result.error); return; }
    const account = staff.find(s => s.professionalId === pro.id);
    setActionMsg(account
      ? `${pro.name} voltou para a equipe e já aparece no site. O acesso dela ao painel continua bloqueado: se ela for usar, clique em "Inativo" no cadastro dela para religar.`
      : `${pro.name} voltou para a equipe e já aparece no site.`);
  };

  const handleToggle = async (member: StaffMember) => {
    setActionError('');
    const result = await setStaffActive(member.userId, !member.active);
    if (result.error) setActionError(result.error);
  };

  const accountRow = (member: StaffMember) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-xs text-[#7C736D]">
        Acesso: <strong>{member.email}</strong>
        {member.role === 'admin' && <span className="ml-1 text-[#70542D] font-semibold">(administradora)</span>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setResetFor(member); setActionError(''); }}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded font-semibold text-[#70542D] bg-[#F8F1E4] hover:bg-[#F1E6D0] transition-colors"
        >
          <KeyRound size={11} /> Nova senha
        </button>
        <button
          onClick={() => handleToggle(member)}
          disabled={member.userId === me?.id}
          title={member.userId === me?.id ? 'Você não pode desativar o seu próprio acesso' : undefined}
          className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-semibold transition-colors disabled:opacity-50 ${
            member.active ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-red-700 bg-red-50 hover:bg-red-100'
          }`}
        >
          {member.active ? <><UserCheck size={11} /> Ativo</> : <><UserX size={11} /> Inativo</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-[#29231F]">Equipe &amp; Acessos</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowNewPro(!showNewPro); setShowNewAccount(false); }}
            className="flex items-center gap-2 px-4 py-2 border border-[#251B17] text-[#251B17] rounded-lg text-sm font-semibold hover:bg-[#F8F1E4] transition-colors"
          >
            <UserPlus size={15} /> Adicionar profissional
          </button>
          <button
            onClick={() => { setShowNewAccount(!showNewAccount); setShowNewPro(false); setCreateError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] transition-colors"
          >
            <Plus size={15} /> Nova conta de acesso
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800" role="status">{actionMsg}</div>
      )}

      {/* Nova profissional */}
      <AnimatePresence>
        {showNewPro && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <NewProfessionalForm
              onCancel={() => setShowNewPro(false)}
              onCreated={(name) => {
                setShowNewPro(false);
                setActionError('');
                setActionMsg(`${name} entrou na equipe e já aparece no site e no agendamento. Para ela usar o painel, clique em "Nova conta de acesso".`);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {createdMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800" role="status">{createdMsg}</div>
      )}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">{actionError}</div>
      )}

      {/* Nova conta */}
      <div ref={accountFormRef} className="scroll-mt-4" />
      <AnimatePresence>
        {showNewAccount && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] p-5 space-y-4">
              <h4 className="font-semibold text-sm text-[#29231F]">Criar acesso ao painel</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipo de acesso</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} className={inputClass}>
                    <option value="collaborator">Colaboradora (vê só a própria agenda)</option>
                    <option value="admin">Administradora (vê tudo)</option>
                  </select>
                </div>
                {newRole === 'collaborator' ? (
                  <div>
                    <label className={labelClass}>Profissional</label>
                    <select value={newProId} onChange={e => setNewProId(e.target.value)} className={inputClass}>
                      <option value="">Selecione</option>
                      {professionals
                        .filter(p => !staff.some(s => s.professionalId === p.id))
                        .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={labelClass}>Nome</label>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className={inputClass} />
                  </div>
                )}
                <div>
                  <label className={labelClass}>E-mail de acesso</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" autoComplete="off" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Senha inicial</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" className={inputClass} />
                </div>
              </div>
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowNewAccount(false)} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button onClick={handleCreateAccount} disabled={creating} className="flex-1 h-10 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] disabled:opacity-60">
                  {creating ? 'Criando...' : 'Criar acesso'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Administradoras */}
      {admins.length > 0 && (
        <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7C736D] flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#C7A15D]" /> Administração
          </h4>
          {admins.map(a => (
            <div key={a.userId} className="space-y-1">
              <div className="text-sm font-semibold text-[#29231F]">{a.name}</div>
              {accountRow(a)}
            </div>
          ))}
        </div>
      )}

      {/* Profissionais */}
      <div className="space-y-4">
        {professionals.map(pro => {
          const account = staff.find(s => s.professionalId === pro.id);
          const isEditing = editingId === pro.id;
          const wasSaved = saved === pro.id;

          return (
            <div key={pro.id} className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {pro.photoUrl ? (
                    <img src={pro.photoUrl} alt={pro.name} className="w-10 h-10 rounded-full object-cover border border-[rgba(37,27,23,0.1)]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#F1E6D0] flex items-center justify-center text-[#C7A15D] font-serif font-bold text-xs">
                      {pro.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#29231F]">{pro.name}</span>
                      {(pro.specialtyBadge || pro.specialtyHighlight) && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#F8F1E4] text-[#70542D] border border-[#E6D4B8] rounded font-bold uppercase">
                          {pro.specialtyBadge || pro.specialtyHighlight}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#7C736D]">{pro.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {wasSaved && <Check size={14} className="text-emerald-600" />}
                  <button
                    onClick={() => { setRemoving(pro); setActionError(''); setActionMsg(''); }}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <UserMinus size={11} /> Remover da equipe
                  </button>
                  <button
                    onClick={() => (isEditing ? setEditingId(null) : startEdit(pro))}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label={isEditing ? 'Fechar edição' : `Editar ${pro.name}`}
                  >
                    {isEditing ? <X size={15} /> : <Edit2 size={15} className="text-[#7C736D]" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isEditing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-[rgba(37,27,23,0.06)] overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div>
                        <label className={`${labelClass} flex items-center gap-1`}><Phone size={11} /> WhatsApp (com DDD)</label>
                        <input type="text" value={editData.whatsapp ?? ''} onChange={e => setEditData(d => ({ ...d, whatsapp: e.target.value }))} placeholder="(38) 99999-9999" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Endereço da fotografia (opcional)</label>
                        <input type="text" value={editData.photoUrl ?? ''} onChange={e => setEditData(d => ({ ...d, photoUrl: e.target.value }))} placeholder="/team/nome.webp ou https://..." className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Bio</label>
                        <textarea rows={2} value={editData.bio ?? ''} onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))} className="w-full p-2 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none" />
                      </div>
                      <div>
                        <label className={labelClass}>Taxa de comissão (%)</label>
                        <input
                          type="number" min={0} max={100}
                          value={Math.round((editData.commissionRate ?? 0.5) * 100)}
                          onChange={e => setEditData(d => ({ ...d, commissionRate: (parseInt(e.target.value) || 0) / 100 }))}
                          className="w-32 h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                        />
                        <p className="text-[11px] text-[#7C736D] mt-1">Vale para novos agendamentos. Atendimentos antigos mantêm a taxa da época.</p>
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="flex-1 h-9 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleSave} className="flex-1 h-9 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e]">Salvar</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="px-4 pb-3">
                {account ? accountRow(account) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-amber-600 font-semibold">⚠ Sem acesso ao painel</span>
                    <button
                      onClick={() => openAccountFormFor(pro.id)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded font-semibold text-white bg-[#251B17] hover:bg-[#1a120e] transition-colors"
                    >
                      <KeyRound size={11} /> Criar acesso
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quem saiu da equipe */}
      {formerProfessionals.length > 0 && (
        <div className="bg-[#FAF8F5] rounded-xl border border-[rgba(37,27,23,0.09)] p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7C736D]">Saíram da equipe</h4>
          <p className="text-[11px] text-[#7C736D]">Não aparecem no site nem no agendamento. O histórico de atendimentos delas continua guardado.</p>
          {formerProfessionals.map(pro => (
            <div key={pro.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-[#29231F]">{pro.name} <span className="text-xs text-[#7C736D]">{pro.role}</span></span>
              <button
                onClick={() => handleRestore(pro)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded font-semibold text-[#70542D] bg-[#F8F1E4] hover:bg-[#F1E6D0] transition-colors"
              >
                <RotateCcw size={11} /> Readicionar
              </button>
            </div>
          ))}
        </div>
      )}

      {resetFor && <ResetPasswordModal member={resetFor} onClose={() => setResetFor(null)} />}
      {removing && (
        <RemoveProfessionalModal
          pro={removing}
          hasAccount={staff.some(s => s.professionalId === removing.id && s.active)}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setActionMsg(`${removing.name} saiu da equipe. Ela não aparece mais no site e o acesso dela ao painel foi bloqueado.`);
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}

function NewProfessionalForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (name: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');
  const [commission, setCommission] = useState(50);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCategory = (id: ServiceCategory) =>
    setCategories(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));

  const handleSave = async () => {
    setError('');
    setSaving(true);
    const result = await createProfessional({ name, role, categories, whatsapp, photoUrl, bio, commissionRate: commission / 100 });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onCreated(name.trim());
  };

  return (
    <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] p-5 space-y-4">
      <h4 className="font-semibold text-sm text-[#29231F]">Adicionar profissional à equipe</h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nome</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Como aparece no site" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Função</label>
          <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex.: Manicure e Pedicure" className={inputClass} />
        </div>
        <div>
          <label className={`${labelClass} flex items-center gap-1`}><Phone size={11} /> WhatsApp (opcional)</label>
          <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(38) 99999-9999" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Comissão (%)</label>
          <input type="number" min={0} max={100} value={commission} onChange={e => setCommission(parseInt(e.target.value) || 0)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Que tipos de serviço ela faz?</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => {
            const on = categories.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                aria-pressed={on}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  on ? 'bg-[#251B17] text-white border-[#251B17]' : 'bg-white text-[#29231F] border-[rgba(37,27,23,0.15)] hover:border-[#C7A15D]'
                }`}
              >
                {on && <Check size={11} className="inline mr-1" />}{c.shortName}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#7C736D] mt-1">As clientes só conseguem agendar com ela os serviços desses tipos.</p>
      </div>
      <div>
        <label className={labelClass}>Endereço da fotografia (opcional)</label>
        <input type="text" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Bio (opcional)</label>
        <textarea rows={2} value={bio} onChange={e => setBio(e.target.value)} className="w-full p-2 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none" />
      </div>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 h-10 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] disabled:opacity-60">
          {saving ? 'Salvando...' : 'Adicionar à equipe'}
        </button>
      </div>
    </div>
  );
}

function RemoveProfessionalModal({ pro, hasAccount, onClose, onRemoved }: {
  pro: Professional; hasAccount: boolean; onClose: () => void; onRemoved: () => void;
}) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const upcoming = getUpcomingBookingsCount(pro.id);

  const handleRemove = async () => {
    setError('');
    setSaving(true);
    const result = await removeProfessional(pro.id);
    setSaving(false);
    if (result.error) setError(result.error);
    else onRemoved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="remove-pro-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 id="remove-pro-title" className="font-semibold text-[#29231F]">Remover {pro.name} da equipe?</h3>
        <ul className="text-sm text-[#5A514B] space-y-1.5 list-disc pl-5">
          <li>Ela some do site e ninguém mais consegue agendar com ela.</li>
          {hasAccount && <li>O acesso dela ao painel é bloqueado na hora.</li>}
          <li>O histórico de atendimentos e comissões dela continua guardado.</li>
          <li>Se ela voltar, é só clicar em "Readicionar".</li>
        </ul>
        {upcoming > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Atenção: ela tem <strong>{upcoming} {upcoming === 1 ? 'agendamento marcado' : 'agendamentos marcados'}</strong> a partir de hoje.
            Eles continuam na agenda: remarque para outra profissional ou cancele avisando a cliente.
          </div>
        )}
        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={handleRemove} disabled={saving} className="flex-1 h-10 bg-red-700 text-white rounded-lg text-sm font-semibold hover:bg-red-800 disabled:opacity-60">
            {saving ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    setSaving(true);
    const result = await resetStaffPassword(member.userId, password);
    setSaving(false);
    if (result.error) setError(result.error);
    else setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form onSubmit={handleSave} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 id="reset-password-title" className="font-semibold text-[#29231F]">Nova senha para {member.name}</h3>
        {done ? (
          <>
            <p className="text-sm text-emerald-700">Senha definida. Passe a nova senha pessoalmente para {member.name}.</p>
            <button type="button" onClick={onClose} className="w-full h-10 bg-[#251B17] text-white rounded-lg text-sm font-semibold">Fechar</button>
          </>
        ) : (
          <>
            <div>
              <label className={labelClass}>Nova senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={inputClass} />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 bg-[#251B17] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                {saving ? 'Salvando...' : 'Definir senha'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
