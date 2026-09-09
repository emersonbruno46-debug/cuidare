// ─────────────────────────────────────────────
// CUIDARE — BusinessSettings Panel
// Configurações do negócio (Admin only)
// ─────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Instagram, Phone, MapPin, Clock, AlertCircle, Check } from 'lucide-react';
import { getBusinessSettings, updateBusinessSettings } from '../../lib/businessSettings';

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function BusinessSettingsPanel() {
  const [settings, setSettings] = useState(() => getBusinessSettings());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    updateBusinessSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateHours = (dayOfWeek: number, field: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      openingHours: prev.openingHours.map(h =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#29231F]">Configurações do Negócio</h3>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-[#251B17] text-white hover:bg-[#1a120e]'
          }`}
        >
          {saved ? <><Check size={15} /> Salvo!</> : <><Save size={15} /> Salvar alterações</>}
        </motion.button>
      </div>

      <div className="grid gap-6">
        {/* Social & Contact */}
        <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] p-6 space-y-4">
          <h4 className="text-sm font-semibold text-[#29231F] flex items-center gap-2">
            <Phone size={16} className="text-[#C7A15D]" /> Contatos e Redes Sociais
          </h4>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">
              WhatsApp do negócio (com DDI: 5538...)
            </label>
            <input
              type="text"
              value={settings.businessWhatsapp ?? ''}
              onChange={e => setSettings(prev => ({ ...prev, businessWhatsapp: e.target.value }))}
              placeholder="5538991007706"
              className="w-full h-10 px-4 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
            />
            <p className="text-[11px] text-[#7C736D] mt-1">Formato E.164 sem espaços ou símbolos. Ex: 5538991007706</p>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">
              Mensagem inicial do WhatsApp
            </label>
            <textarea
              rows={2}
              value={settings.businessWhatsappMessage ?? ''}
              onChange={e => setSettings(prev => ({ ...prev, businessWhatsappMessage: e.target.value }))}
              className="w-full p-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5 flex items-center gap-1">
              <Instagram size={12} /> URL do Instagram
            </label>
            <input
              type="url"
              value={settings.instagramUrl ?? ''}
              onChange={e => setSettings(prev => ({ ...prev, instagramUrl: e.target.value }))}
              placeholder="https://instagram.com/cuidare"
              className="w-full h-10 px-4 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] p-6 space-y-4">
          <h4 className="text-sm font-semibold text-[#29231F] flex items-center gap-2">
            <MapPin size={16} className="text-[#C7A15D]" /> Endereço
          </h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">Endereço</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings(prev => ({ ...prev, address: e.target.value }))}
                className="w-full h-10 px-4 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">Cidade</label>
              <input
                type="text"
                value={settings.city}
                onChange={e => setSettings(prev => ({ ...prev, city: e.target.value }))}
                className="w-full h-10 px-4 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">Estado</label>
              <input
                type="text"
                value={settings.state}
                onChange={e => setSettings(prev => ({ ...prev, state: e.target.value }))}
                className="w-full h-10 px-4 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
              />
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] p-6 space-y-4">
          <h4 className="text-sm font-semibold text-[#29231F] flex items-center gap-2">
            <Clock size={16} className="text-[#C7A15D]" /> Horários de Funcionamento
          </h4>
          <div className="space-y-3">
            {settings.openingHours.map(h => (
              <div key={h.dayOfWeek} className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-[#29231F] w-20 shrink-0">{DAYS_PT[h.dayOfWeek]}</span>
                <label className="flex items-center gap-1.5 text-xs text-[#7C736D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={e => updateHours(h.dayOfWeek, 'closed', e.target.checked)}
                    className="rounded"
                  />
                  Fechado
                </label>
                {!h.closed && (
                  <>
                    <input
                      type="time"
                      value={h.open}
                      onChange={e => updateHours(h.dayOfWeek, 'open', e.target.value)}
                      className="h-8 px-2 border border-[rgba(37,27,23,0.12)] rounded text-xs focus:outline-none focus:border-[#C7A15D]"
                    />
                    <span className="text-xs text-[#7C736D]">até</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={e => updateHours(h.dayOfWeek, 'close', e.target.value)}
                      className="h-8 px-2 border border-[rgba(37,27,23,0.12)] rounded text-xs focus:outline-none focus:border-[#C7A15D]"
                    />
                    <span className="text-xs text-[#7C736D]">Intervalo:</span>
                    <input
                      type="time"
                      value={h.breakStart ?? ''}
                      onChange={e => updateHours(h.dayOfWeek, 'breakStart', e.target.value)}
                      placeholder="--:--"
                      className="h-8 px-2 border border-[rgba(37,27,23,0.12)] rounded text-xs focus:outline-none focus:border-[#C7A15D]"
                    />
                    <span className="text-xs text-[#7C736D]">—</span>
                    <input
                      type="time"
                      value={h.breakEnd ?? ''}
                      onChange={e => updateHours(h.dayOfWeek, 'breakEnd', e.target.value)}
                      className="h-8 px-2 border border-[rgba(37,27,23,0.12)] rounded text-xs focus:outline-none focus:border-[#C7A15D]"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Commission */}
        <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] p-6 space-y-4">
          <h4 className="text-sm font-semibold text-[#29231F]">Taxa de Comissão Padrão</h4>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.commissionDefaultRate * 100)}
              onChange={e => setSettings(prev => ({ ...prev, commissionDefaultRate: parseInt(e.target.value) / 100 }))}
              className="flex-1 accent-[#C7A15D]"
            />
            <span className="text-lg font-bold text-[#29231F] w-16 text-right">
              {Math.round(settings.commissionDefaultRate * 100)}%
            </span>
          </div>
          <p className="text-xs text-[#7C736D]">
            Taxa padrão aplicada a todas as profissionais. Pode ser personalizada por profissional no cadastro de cada uma.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700">
            <strong>Pendências de configuração:</strong> Preencha o URL do Instagram e os números de WhatsApp individuais de cada profissional para ativar os links nas páginas públicas.
          </div>
        </div>
      </div>
    </div>
  );
}
