// ─────────────────────────────────────────────
// CUIDARE — StaffManager
// Gestão de profissionais e contas (Admin only)
// ─────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, X, Check, Phone, UserCheck, UserX } from 'lucide-react';
import type { Professional } from '../../types';
import { getProfessionals, updateProfessional } from '../../lib/dataService';
import { createAccount, listAccounts, toggleAccountActive } from '../../lib/auth';

export default function StaffManager() {
  const [professionals, setProfessionals] = useState(() => getProfessionals());
  const [accounts] = useState(() => listAccounts());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Professional>>({});
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newProId, setNewProId] = useState('');
  const [createError, setCreateError] = useState('');
  const [saved, setSaved] = useState('');

  const refresh = () => setProfessionals(getProfessionals());

  const startEdit = (pro: Professional) => {
    setEditingId(pro.id);
    setEditData({ ...pro });
  };

  const handleSave = () => {
    if (!editingId) return;
    updateProfessional(editingId, editData);
    refresh();
    setEditingId(null);
    setSaved(editingId);
    setTimeout(() => setSaved(''), 2000);
  };

  const handleCreateAccount = () => {
    setCreateError('');
    if (!newEmail || !newPassword || !newProId) {
      setCreateError('Preencha e-mail, senha e profissional.'); return;
    }
    const pro = professionals.find(p => p.id === newProId);
    const result = createAccount({
      email: newEmail,
      name: pro?.name ?? 'Colaboradora',
      role: 'collaborator',
      professionalId: newProId,
      password: newPassword,
    });
    if (result.error) {
      setCreateError(result.error);
    } else {
      setShowNewAccount(false);
      setNewEmail(''); setNewPassword(''); setNewProId('');
    }
  };

  const handleToggleAccount = (id: string) => {
    toggleAccountActive(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#29231F]">Equipe &amp; Acessos</h3>
        <button
          onClick={() => setShowNewAccount(!showNewAccount)}
          className="flex items-center gap-2 px-4 py-2 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] transition-colors"
        >
          <Plus size={15} /> Nova conta de acesso
        </button>
      </div>

      {/* New account form */}
      <AnimatePresence>
        {showNewAccount && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] p-5 space-y-4">
              <h4 className="font-semibold text-sm text-[#29231F]">Criar acesso de colaboradora</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Profissional</label>
                  <select value={newProId} onChange={e => setNewProId(e.target.value)} className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]">
                    <option value="">Selecione</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">E-mail de acesso</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nome@cuidare.com.br" className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Senha inicial</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]" />
                </div>
              </div>
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowNewAccount(false)} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button onClick={handleCreateAccount} className="flex-1 h-10 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e]">Criar acesso</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professionals list */}
      <div className="space-y-4">
        {professionals.map(pro => {
          const account = accounts.find(a => a.professionalId === pro.id);
          const isEditing = editingId === pro.id;
          const wasSaved = saved === pro.id;

          return (
            <div key={pro.id} className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm overflow-hidden">
              {/* Pro header */}
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
                    onClick={() => isEditing ? setEditingId(null) : startEdit(pro)}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    {isEditing ? <X size={15} /> : <Edit2 size={15} className="text-[#7C736D]" />}
                  </button>
                </div>
              </div>

              {/* Edit form */}
              <AnimatePresence>
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-[rgba(37,27,23,0.06)] overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1 flex items-center gap-1">
                          <Phone size={11} /> WhatsApp (E.164: 5538...)
                        </label>
                        <input
                          type="text"
                          value={editData.whatsapp ?? ''}
                          onChange={e => setEditData(d => ({ ...d, whatsapp: e.target.value }))}
                          placeholder="5538XXXXXXXXX"
                          className="w-full h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">URL da Fotografia (opcional)</label>
                        <input
                          type="text"
                          value={editData.photoUrl ?? ''}
                          onChange={e => setEditData(d => ({ ...d, photoUrl: e.target.value || undefined }))}
                          placeholder="https://... (deixe em branco para manter o monograma)"
                          className="w-full h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Bio</label>
                        <textarea
                          rows={2}
                          value={editData.bio ?? ''}
                          onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
                          className="w-full p-2 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Taxa de Comissão (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Math.round((editData.commissionRate ?? 0.5) * 100)}
                          onChange={e => setEditData(d => ({ ...d, commissionRate: parseInt(e.target.value) / 100 }))}
                          className="w-32 h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="flex-1 h-9 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleSave} className="flex-1 h-9 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e]">Salvar</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Account status */}
              <div className="px-4 pb-3 flex items-center justify-between">
                <div className="text-xs text-[#7C736D]">
                  {account
                    ? <span>Acesso: <strong>{account.email}</strong></span>
                    : <span className="text-amber-600 font-semibold">⚠ Sem acesso configurado</span>
                  }
                </div>
                {account && (
                  <button
                    onClick={() => handleToggleAccount(account.id)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-semibold transition-colors ${
                      account.active
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-red-700 bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    {account.active ? <><UserCheck size={11} /> Ativo</> : <><UserX size={11} /> Inativo</>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
