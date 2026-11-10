// ─────────────────────────────────────────────
// CUIDARE — Serviços & Preços (só administradora)
// Editar nome, preço, duração, descrição e quem faz cada serviço.
// Tudo é gravado no banco e aparece no site na hora.
// ─────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { Plus, Edit2, Search, Eye, EyeOff, Clock, Users, X, Check } from 'lucide-react';
import type { Service, ServiceCategory, ServiceFlowType } from '../../types';
import { CATEGORIES } from '../../data/categoriesData';
import {
  getAllServices, getProfessionals, getPriceMode, saveService, setServiceActive, useDataVersion,
  type PriceMode, type ServiceInput
} from '../../lib/dataService';

const inputClass = 'w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]';
const labelClass = 'block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1';

const PRICE_MODES: { id: PriceMode; label: string; hint: string }[] = [
  { id: 'fixed', label: 'Preço fixo', hint: 'Ex.: R$ 35,00' },
  { id: 'from', label: 'A partir de', hint: 'Ex.: A partir de R$ 35,00' },
  { id: 'sizes', label: 'Por tamanho (P/M/G)', hint: 'Cabelo curto, médio e longo' },
  { id: 'range', label: 'Faixa de preço', hint: 'Ex.: R$ 180,00 a R$ 250,00' }
];

const FLOW_TYPES: { id: ServiceFlowType; label: string }[] = [
  { id: 'agendamento_direto', label: 'A cliente agenda direto pelo site' },
  { id: 'consulta_recepcao', label: 'Sob consulta com a recepção' },
  { id: 'avaliacao_previa', label: 'Precisa de avaliação prévia' },
  { id: 'curso_turmas', label: 'Curso / turmas' }
];

const reais = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Como o preço aparece para a cliente no site. */
function priceLabel(s: Pick<Service, 'category' | 'priceBase' | 'priceType' | 'priceRange' | 'priceDetails' | 'variablePrice'>): string {
  if (s.category === 'cursos' && s.priceBase === 0) return 'Sob consulta';
  if (s.priceRange) return `${reais(s.priceRange.min)} a ${reais(s.priceRange.max)}`;
  if (s.priceDetails) return `A partir de ${reais(s.priceDetails.P)} (P ${reais(s.priceDetails.P)} · M ${reais(s.priceDetails.M)} · G ${reais(s.priceDetails.G)})`;
  if (s.variablePrice) return `A partir de ${reais(s.priceBase)}`;
  return reais(s.priceBase);
}

const categoryName = (id: string) => CATEGORIES.find(c => c.id === id)?.name ?? id;

export default function ServicesManager() {
  useDataVersion();
  const services = getAllServices();
  const professionals = getProfessionals().filter(p => p.active !== false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('todas');
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const filtered = useMemo(() => services
    .filter(s => category === 'todas' || s.category === category)
    .filter(s => !search.trim() || normalize(s.name).includes(normalize(search.trim()))),
  [services, category, search]);

  const whoDoes = (s: Service) => {
    const list = s.professionalIds && s.professionalIds.length > 0
      ? professionals.filter(p => s.professionalIds!.includes(p.id))
      : professionals.filter(p => p.categories.includes(s.category));
    return list.length > 0 ? list.map(p => p.name.split(' ')[0]).join(', ') : 'Ninguém da equipe';
  };

  const toggleActive = async (s: Service) => {
    setError('');
    setMessage('');
    const result = await setServiceActive(s.id, s.active === false);
    if (result.error) { setError(result.error); return; }
    setMessage(s.active === false
      ? `"${s.name}" voltou para o site.`
      : `"${s.name}" saiu do site. Agendamentos já marcados continuam valendo.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#29231F]">Serviços &amp; Preços</h3>
          <p className="text-xs text-[#7C736D]">O que você mudar aqui aparece no site na hora.</p>
        </div>
        <button
          onClick={() => { setEditing('new'); setMessage(''); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] transition-colors"
        >
          <Plus size={15} /> Novo serviço
        </button>
      </div>

      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800" role="status">{message}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C736D]" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar serviço"
            aria-label="Buscar serviço"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filtrar por categoria" className={`${inputClass} sm:w-60`}>
          <option value="todas">Todas as categorias</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm divide-y divide-[rgba(37,27,23,0.06)]">
        {filtered.length === 0 && <p className="p-6 text-sm text-center text-[#7C736D]">Nenhum serviço encontrado.</p>}
        {filtered.map(s => {
          const off = s.active === false;
          return (
            <div key={s.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${off ? 'bg-[#FAF8F5]' : ''}`}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-semibold text-sm ${off ? 'text-[#7C736D] line-through' : 'text-[#29231F]'}`}>{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F8F1E4] text-[#70542D] font-semibold">{categoryName(s.category)}</span>
                  {off && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Fora do site</span>}
                </div>
                <div className="text-sm text-[#29231F]">{priceLabel(s)}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7C736D]">
                  <span className="flex items-center gap-1"><Clock size={12} /> {s.duration} min</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {whoDoes(s)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setEditing(s); setMessage(''); setError(''); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold text-[#70542D] bg-[#F8F1E4] hover:bg-[#F1E6D0] transition-colors"
                >
                  <Edit2 size={12} /> Editar
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${off
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-[#7C736D] bg-gray-50 hover:bg-gray-100'}`}
                >
                  {off ? <><Eye size={12} /> Voltar ao site</> : <><EyeOff size={12} /> Tirar do site</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <ServiceEditor
          service={editing === 'new' ? null : editing}
          defaultCategory={category !== 'todas' ? (category as ServiceCategory) : 'escovas'}
          onClose={() => setEditing(null)}
          onSaved={(name, isNew) => {
            setEditing(null);
            setMessage(isNew ? `"${name}" foi criado e já aparece no site.` : `"${name}" foi atualizado. Agendamentos já marcados mantêm o preço antigo.`);
          }}
        />
      )}
    </div>
  );
}

function ServiceEditor({ service, defaultCategory, onClose, onSaved }: {
  service: Service | null;
  defaultCategory: ServiceCategory;
  onClose: () => void;
  onSaved: (name: string, isNew: boolean) => void;
}) {
  const professionals = getProfessionals().filter(p => p.active !== false);
  const mode0 = service ? getPriceMode(service) : 'fixed';

  const [name, setName] = useState(service?.name ?? '');
  const [category, setCategory] = useState<ServiceCategory>(service?.category ?? defaultCategory);
  const [description, setDescription] = useState(service?.description ?? '');
  const [duration, setDuration] = useState(String(service?.duration ?? 60));
  const [priceMode, setPriceMode] = useState<PriceMode>(mode0);
  const [price, setPrice] = useState(String(service?.priceBase ?? ''));
  const [sizeP, setSizeP] = useState(String(service?.priceDetails?.P ?? ''));
  const [sizeM, setSizeM] = useState(String(service?.priceDetails?.M ?? ''));
  const [sizeG, setSizeG] = useState(String(service?.priceDetails?.G ?? ''));
  const [rangeMin, setRangeMin] = useState(String(service?.priceRange?.min ?? ''));
  const [rangeMax, setRangeMax] = useState(String(service?.priceRange?.max ?? ''));
  const [chooseWho, setChooseWho] = useState((service?.professionalIds?.length ?? 0) > 0);
  const [who, setWho] = useState<string[]>(service?.professionalIds ?? []);
  const [note, setNote] = useState(service?.note ?? '');
  const [flowType, setFlowType] = useState<ServiceFlowType>(service?.flowType ?? 'agendamento_direto');
  const [flowBadge, setFlowBadge] = useState(service?.flowBadge ?? '');
  const [active, setActive] = useState(service?.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toNum = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));
  const byCategory = professionals.filter(p => p.categories.includes(category));

  // Como vai aparecer no site
  const preview = (() => {
    const p = toNum(price), P = toNum(sizeP), M = toNum(sizeM), G = toNum(sizeG), min = toNum(rangeMin), max = toNum(rangeMax);
    if (priceMode === 'sizes') return [P, M, G].every(Number.isFinite) ? priceLabel({ category, priceBase: P, priceDetails: { P, M, G }, variablePrice: true }) : '';
    if (priceMode === 'range') return [min, max].every(Number.isFinite) ? priceLabel({ category, priceBase: min, priceRange: { min, max }, variablePrice: true }) : '';
    return Number.isFinite(p) ? priceLabel({ category, priceBase: p, variablePrice: priceMode === 'from' }) : '';
  })();

  const handleSave = async () => {
    setError('');
    if (chooseWho && who.length === 0) { setError('Marque pelo menos uma profissional, ou escolha "Todas da categoria".'); return; }
    const input: ServiceInput = {
      name, category, description,
      duration: toNum(duration),
      priceMode,
      price: toNum(price),
      sizes: { P: toNum(sizeP), M: toNum(sizeM), G: toNum(sizeG) },
      range: { min: toNum(rangeMin), max: toNum(rangeMax) },
      professionalIds: chooseWho ? who : [],
      note, flowType, flowBadge, active
    };
    setSaving(true);
    const result = await saveService(input, service?.id);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved(name.trim(), !service);
  };

  const chip = (on: boolean) =>
    `text-xs px-3 py-1.5 rounded-full border transition-colors ${on
      ? 'bg-[#251B17] text-white border-[#251B17]'
      : 'bg-white text-[#29231F] border-[rgba(37,27,23,0.15)] hover:border-[#C7A15D]'}`;

  const moneyInput = (label: string, value: string, set: (v: string) => void) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7C736D]">R$</span>
        <input type="number" min={0} step="0.01" inputMode="decimal" value={value} onChange={e => set(e.target.value)} className={`${inputClass} pl-9`} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="service-editor-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="p-5 border-b border-[rgba(37,27,23,0.09)] flex items-center justify-between shrink-0">
          <h3 id="service-editor-title" className="font-semibold text-[#29231F]">{service ? `Editar: ${service.name}` : 'Novo serviço'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md" aria-label="Fechar"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Básico */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nome do serviço</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Escova Modelada" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value as ServiceCategory)} className={inputClass}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Duração (minutos)</label>
              <input type="number" min={5} max={720} step={5} value={duration} onChange={e => setDuration(e.target.value)} className={inputClass} />
              <p className="text-[11px] text-[#7C736D] mt-1">É o tempo que fica reservado na agenda.</p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Descrição (aparece no site)</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none" />
            </div>
          </div>

          {/* Preço */}
          <div className="space-y-3">
            <p className={labelClass}>Preço</p>
            <div className="flex flex-wrap gap-2">
              {PRICE_MODES.map(m => (
                <button key={m.id} type="button" onClick={() => setPriceMode(m.id)} aria-pressed={priceMode === m.id} title={m.hint} className={chip(priceMode === m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
            {(priceMode === 'fixed' || priceMode === 'from') && (
              <div className="sm:w-1/2">{moneyInput(priceMode === 'from' ? 'A partir de' : 'Valor', price, setPrice)}</div>
            )}
            {priceMode === 'sizes' && (
              <div className="grid grid-cols-3 gap-3">
                {moneyInput('Curto (P)', sizeP, setSizeP)}
                {moneyInput('Médio (M)', sizeM, setSizeM)}
                {moneyInput('Longo (G)', sizeG, setSizeG)}
              </div>
            )}
            {priceMode === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                {moneyInput('De', rangeMin, setRangeMin)}
                {moneyInput('Até', rangeMax, setRangeMax)}
              </div>
            )}
            {preview && (
              <p className="text-xs text-[#5C534D]">No site aparece: <strong className="text-[#29231F]">{preview}</strong></p>
            )}
            {service && <p className="text-[11px] text-[#7C736D]">Mudar o preço vale para novos agendamentos. Os já marcados mantêm o preço antigo.</p>}
          </div>

          {/* Quem faz */}
          <div className="space-y-3">
            <p className={labelClass}>Quem faz este serviço</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-[#29231F] cursor-pointer">
                <input type="radio" name="who" checked={!chooseWho} onChange={() => setChooseWho(false)} className="mt-1 accent-[#251B17]" />
                <span>
                  Todas que atendem {categoryName(category)}
                  <span className="block text-xs text-[#7C736D]">
                    {byCategory.length > 0 ? byCategory.map(p => p.name).join(', ') : 'Hoje ninguém da equipe atende esta categoria.'}
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#29231F] cursor-pointer">
                <input type="radio" name="who" checked={chooseWho} onChange={() => { setChooseWho(true); if (who.length === 0) setWho(byCategory.map(p => p.id)); }} className="accent-[#251B17]" />
                Só as que eu escolher
              </label>
            </div>
            {chooseWho && (
              <div className="flex flex-wrap gap-2 pl-6">
                {professionals.map(p => {
                  const on = who.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setWho(w => (on ? w.filter(x => x !== p.id) : [...w, p.id]))}
                      className={chip(on)}
                    >
                      {on && <Check size={11} className="inline mr-1" />}{p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outros detalhes */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Como a cliente agenda</label>
              <select value={flowType} onChange={e => setFlowType(e.target.value as ServiceFlowType)} className={inputClass}>
                {FLOW_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Etiqueta (opcional)</label>
              <input type="text" value={flowBadge} onChange={e => setFlowBadge(e.target.value)} placeholder="Ex.: Sob Consulta" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Observação (opcional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: Inclui finalização" className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#29231F] cursor-pointer">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[#251B17] w-4 h-4" />
            Aparece no site e pode ser agendado
          </label>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>

        <div className="p-4 border-t border-[rgba(37,27,23,0.09)] flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 h-11 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] disabled:opacity-60">
            {saving ? 'Salvando...' : service ? 'Salvar alterações' : 'Criar serviço'}
          </button>
        </div>
      </div>
    </div>
  );
}
