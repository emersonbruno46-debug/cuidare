// ─────────────────────────────────────────────
// CUIDARE — "Meu agendamento"
// Página que a cliente abre pelo link pessoal (/meu-agendamento/<chave>)
// para remarcar ou cancelar sozinha. As regras são conferidas no banco.
// ─────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Sparkles, Phone, ArrowLeft, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import {
  fetchManagedBooking, fetchRescheduleSlots, clientRescheduleBooking, clientCancelBooking,
  getProfessionals, useDataVersion, type ManagedBooking, type PublicSlot
} from '../lib/dataService';
import { buildWhatsAppLink } from '../lib/businessSettings';
import { formatDateLabel, getNextBusinessDays, getNowInSaoPaulo, addDaysToDateString } from '../lib/dateUtils';
import { services as staticServices } from '../data/servicesData';

type Mode = 'view' | 'reschedule' | 'cancel';
const ANY = '__any__';

// O que a cliente acabou de fazer (para montar os avisos às profissionais)
type RescheduleInfo = { before: ManagedBooking; date: string; time: string; professionalId: string; professionalName: string };
type LastAction =
  | ({ kind: 'reschedule' } & RescheduleInfo)
  | { kind: 'cancel'; before: ManagedBooking; reason: string };

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pendente: { text: 'Aguardando confirmação', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  confirmado: { text: 'Confirmado', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  cancelado: { text: 'Cancelado', className: 'bg-red-50 text-red-700 border-red-200' },
  concluido: { text: 'Realizado', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  faltou: { text: 'Não compareceu', className: 'bg-gray-50 text-gray-700 border-gray-200' }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ManageBookingPage() {
  useDataVersion();
  const { token = '' } = useParams();

  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<Mode>('view');
  const [notice, setNotice] = useState('');
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await fetchManagedBooking(token);
    setLoading(false);
    if (result.error || !result.booking) {
      setLoadError(result.error ?? 'Agendamento não encontrado.');
      setBooking(null);
      return;
    }
    setBooking(result.booking);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const helpLink = buildWhatsAppLink(undefined, booking
    ? `Olá! Preciso de ajuda com meu agendamento de ${booking.serviceName} em ${formatDateLabel(booking.date, 'numeric')} às ${booking.time}.`
    : 'Olá! Preciso de ajuda com meu agendamento.');

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <header className="text-center space-y-1">
          <Link to="/" className="inline-block text-xs tracking-[0.3em] font-semibold text-[#70542D] hover:text-[#29231F]">CUIDARE</Link>
          <h1 className="text-2xl font-serif text-[#251B17]">Meu agendamento</h1>
        </header>

        {loading && (
          <div className="bg-white rounded-2xl border border-[rgba(37,27,23,0.09)] p-8 text-center text-sm text-[#756B65]" role="status">
            Carregando seu agendamento...
          </div>
        )}

        {!loading && loadError && (
          <div className="bg-white rounded-2xl border border-[rgba(37,27,23,0.09)] p-6 text-center space-y-4">
            <AlertCircle size={28} className="mx-auto text-[#C7A15D]" />
            <p className="text-sm text-[#29231F]">{loadError}</p>
            <div className="flex flex-col gap-2">
              <a href={helpLink} target="_blank" rel="noreferrer" className="h-11 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-sm font-semibold flex items-center justify-center gap-2">
                <Phone size={16} /> Falar com o salão no WhatsApp
              </a>
              <Link to="/" className="h-11 rounded-xl border border-[#DDD6CC] text-sm text-[#29231F] flex items-center justify-center hover:bg-black/5">
                Ir para o site
              </Link>
            </div>
          </div>
        )}

        {!loading && booking && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {notice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-start gap-2" role="status">
                <Check size={16} className="shrink-0 mt-0.5" /> {notice}
              </div>
            )}

            {lastAction && <NotifyProfessionals action={lastAction} />}

            <BookingCard booking={booking} />

            {mode === 'view' && (
              <ActionsPanel
                booking={booking}
                helpLink={helpLink}
                onReschedule={() => { setNotice(''); setLastAction(null); setMode('reschedule'); }}
                onCancel={() => { setNotice(''); setLastAction(null); setMode('cancel'); }}
              />
            )}

            {mode === 'reschedule' && (
              <ReschedulePanel
                token={token}
                booking={booking}
                onBack={() => setMode('view')}
                onDone={async (info) => {
                  setMode('view');
                  setNotice('Pronto! Seu horário foi remarcado.');
                  setLastAction({ kind: 'reschedule', ...info });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  await load();
                }}
              />
            )}

            {mode === 'cancel' && (
              <CancelPanel
                token={token}
                booking={booking}
                onBack={() => setMode('view')}
                onDone={async (before, reason) => {
                  setMode('view');
                  setNotice('Seu agendamento foi cancelado e o horário ficou livre. Esperamos te ver em breve!');
                  setLastAction({ kind: 'cancel', before, reason });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  await load();
                }}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** Botões de WhatsApp com a mensagem pronta para avisar as profissionais. */
function NotifyProfessionals({ action }: { action: LastAction }) {
  const pros = getProfessionals();
  const phoneOf = (id: string) => pros.find(p => p.id === id)?.whatsapp;
  const firstNameOf = (name: string) => name.split(' ')[0];
  const when = (date: string, time: string) => `${capitalize(formatDateLabel(date, 'full'))}, às ${time}`;

  const b = action.before;
  const me = b.clientFirstName ? `Aqui é ${b.clientFirstName}.` : 'Sou cliente da Cuidare.';
  const oldWhen = when(b.date, b.time);
  const buttons: { key: string; label: string; href: string; primary: boolean }[] = [];

  if (action.kind === 'reschedule') {
    const newWhen = when(action.date, action.time);
    if (action.professionalId !== b.professionalId) {
      buttons.push({
        key: 'nova',
        primary: true,
        label: `Avisar ${firstNameOf(action.professionalName)} (nova profissional)`,
        href: buildWhatsAppLink(phoneOf(action.professionalId),
          `Olá, ${firstNameOf(action.professionalName)}! ${me} Remarquei meu atendimento pelo site da Cuidare e agora ele é com você:\n\n` +
          `*Serviço:* ${b.serviceName}\n*Data:* ${newWhen}\n\n(Antes estava com ${b.professionalName}: ${oldWhen}.)`)
      });
      buttons.push({
        key: 'antiga',
        primary: false,
        label: `Avisar ${firstNameOf(b.professionalName)} (horário anterior)`,
        href: buildWhatsAppLink(phoneOf(b.professionalId),
          `Olá, ${firstNameOf(b.professionalName)}! ${me} Remarquei meu atendimento de ${b.serviceName} que era com você (${oldWhen}). ` +
          `Ele passou para ${action.professionalName} (${newWhen}), então seu horário ficou livre. Obrigada!`)
      });
    } else {
      buttons.push({
        key: 'mesma',
        primary: true,
        label: `Avisar ${firstNameOf(b.professionalName)}`,
        href: buildWhatsAppLink(phoneOf(b.professionalId),
          `Olá, ${firstNameOf(b.professionalName)}! ${me} Remarquei meu atendimento de ${b.serviceName}:\n\n*Antes:* ${oldWhen}\n*Agora:* ${newWhen}`)
      });
    }
  } else {
    buttons.push({
      key: 'cancel',
      primary: true,
      label: `Avisar ${firstNameOf(b.professionalName)}`,
      href: buildWhatsAppLink(phoneOf(b.professionalId),
        `Olá, ${firstNameOf(b.professionalName)}! ${me} Cancelei meu atendimento de ${b.serviceName} (${oldWhen}).` +
        (action.reason ? `\n\n*Motivo:* ${action.reason}` : ''))
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[rgba(37,27,23,0.09)] shadow-sm p-5 space-y-3">
      <p className="text-sm font-semibold text-[#29231F]">
        {buttons.length > 1 ? 'Avise as profissionais pelo WhatsApp' : 'Avise a profissional pelo WhatsApp'}
      </p>
      <p className="text-xs text-[#5C534D]">A mensagem já vai pronta, é só tocar em enviar.</p>
      <div className="flex flex-col gap-2">
        {buttons.map(btn => (
          <a
            key={btn.key}
            href={btn.href}
            target="_blank"
            rel="noreferrer"
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-center transition-colors ${btn.primary
              ? 'bg-[#25D366] hover:bg-[#20ba5a] text-white'
              : 'border border-[#25D366] text-[#1a8f47] hover:bg-[#25D366]/10'}`}
          >
            <Phone size={15} className="shrink-0" /> {btn.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: ManagedBooking }) {
  const status = STATUS_LABEL[booking.status] ?? STATUS_LABEL.pendente;
  return (
    <div className="bg-white rounded-2xl border border-[rgba(37,27,23,0.09)] shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#29231F]">Olá{booking.clientFirstName ? `, ${booking.clientFirstName}` : ''}!</p>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${status.className}`}>{status.text}</span>
      </div>
      <dl className="space-y-3 text-sm">
        <Row icon={<Sparkles size={15} />} label="Serviço" value={booking.serviceName} />
        <Row icon={<User size={15} />} label="Profissional" value={booking.professionalName} />
        <Row icon={<Calendar size={15} />} label="Data" value={capitalize(formatDateLabel(booking.date, 'full'))} />
        <Row icon={<Clock size={15} />} label="Horário" value={`${booking.time} às ${booking.endTime}`} />
      </dl>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[#C7A15D] mt-0.5">{icon}</span>
      <div>
        <dt className="text-[10px] uppercase tracking-wider font-semibold text-[#7C736D]">{label}</dt>
        <dd className="text-[#29231F] font-medium">{value}</dd>
      </div>
    </div>
  );
}

function ActionsPanel({ booking, helpLink, onReschedule, onCancel }: {
  booking: ManagedBooking; helpLink: string; onReschedule: () => void; onCancel: () => void;
}) {
  if (booking.status === 'cancelado') {
    return (
      <div className="space-y-2">
        <Link to="/" className="h-12 rounded-xl bg-[#251B17] hover:bg-[#1a120e] text-white text-sm font-semibold flex items-center justify-center">
          Agendar outro horário
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {booking.blockReason && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">{booking.blockReason}</div>
      )}
      {booking.canReschedule && (
        <button onClick={onReschedule} className="w-full h-12 rounded-xl bg-[#251B17] hover:bg-[#1a120e] text-white text-sm font-semibold flex items-center justify-center gap-2">
          <RefreshCw size={16} /> Remarcar
        </button>
      )}
      {booking.canCancel && (
        <button onClick={onCancel} className="w-full h-12 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold flex items-center justify-center gap-2">
          <X size={16} /> Cancelar agendamento
        </button>
      )}
      <a href={helpLink} target="_blank" rel="noreferrer" className="w-full h-11 rounded-xl border border-[#DDD6CC] text-[#29231F] hover:bg-black/5 text-sm flex items-center justify-center gap-2">
        <Phone size={15} className="text-[#25D366]" /> Falar com o salão
      </a>
      {(booking.canReschedule || booking.canCancel) && (
        <p className="text-[11px] text-[#7C736D] text-center leading-relaxed">
          Você pode remarcar ou cancelar até {booking.minHours} horas antes do atendimento.
          {booking.canReschedule && ` Ainda pode remarcar ${booking.reschedulesLeft} ${booking.reschedulesLeft === 1 ? 'vez' : 'vezes'}.`}
        </p>
      )}
    </div>
  );
}

function ReschedulePanel({ token, booking, onBack, onDone }: {
  token: string; booking: ManagedBooking; onBack: () => void; onDone: (info: RescheduleInfo) => Promise<void>;
}) {
  // Profissionais que fazem este serviço
  const professionals = getProfessionals().filter(p => p.active !== false);
  const service = staticServices.find(s => s.id === booking.serviceId);
  const eligible = professionals.filter(p =>
    !service ? p.id === booking.professionalId
      : service.professionalIds && service.professionalIds.length > 0
        ? service.professionalIds.includes(p.id)
        : p.categories.includes(service.category)
  );
  const nameOf = (id: string) => professionals.find(p => p.id === id)?.name ?? (id === booking.professionalId ? booking.professionalName : id);

  const [proChoice, setProChoice] = useState<string>(
    eligible.some(p => p.id === booking.professionalId) ? booking.professionalId : ANY
  );
  const days = useMemo(() => getNextBusinessDays(14, addDaysToDateString(getNowInSaoPaulo().todayStr, -1)), []);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [picked, setPicked] = useState<{ time: string; professionalId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError('');
    setPicked(null);
    fetchRescheduleSlots(token, date, proChoice === ANY ? null : proChoice)
      .then(list => { if (!cancelled) setSlots(list); })
      .catch(() => { if (!cancelled) { setSlots([]); setSlotsError('Não foi possível carregar os horários.'); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [token, date, proChoice, reload]);

  // Com "qualquer profissional": fica com a atual se ela estiver livre
  const assign = (slot: PublicSlot) =>
    proChoice !== ANY ? proChoice
      : slot.professionalIds.includes(booking.professionalId) ? booking.professionalId
        : slot.professionalIds[0];

  const isCurrent = (slot: PublicSlot) =>
    date === booking.date && slot.time === booking.time && assign(slot) === booking.professionalId;

  const handleConfirm = async () => {
    if (!picked) return;
    setSaving(true);
    setSaveError('');
    const result = await clientRescheduleBooking(token, date, picked.time, picked.professionalId);
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      setReload(n => n + 1);
      return;
    }
    await onDone({
      before: booking,
      date,
      time: picked.time,
      professionalId: picked.professionalId,
      professionalName: nameOf(picked.professionalId)
    });
  };

  const chip = (active: boolean) =>
    `text-xs px-3 py-2 rounded-full border transition-colors ${active
      ? 'bg-[#251B17] text-white border-[#251B17]'
      : 'bg-white text-[#29231F] border-[rgba(37,27,23,0.15)] hover:border-[#C7A15D]'}`;

  return (
    <div className="bg-white rounded-2xl border border-[rgba(37,27,23,0.09)] shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#29231F]">Escolha o novo horário</h2>
        <button onClick={onBack} className="text-xs text-[#7C736D] hover:text-[#29231F] flex items-center gap-1">
          <ArrowLeft size={13} /> Voltar
        </button>
      </div>

      {eligible.length > 1 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7C736D]">Com quem?</p>
          <div className="flex flex-wrap gap-2">
            {eligible.map(p => (
              <button key={p.id} type="button" onClick={() => setProChoice(p.id)} aria-pressed={proChoice === p.id} className={chip(proChoice === p.id)}>
                {p.name}{p.id === booking.professionalId ? ' (atual)' : ''}
              </button>
            ))}
            <button type="button" onClick={() => setProChoice(ANY)} aria-pressed={proChoice === ANY} className={chip(proChoice === ANY)}>
              Qualquer profissional
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7C736D]">Dia</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map(d => (
            <button
              key={d.dateString}
              type="button"
              onClick={() => setDate(d.dateString)}
              aria-pressed={date === d.dateString}
              className={`shrink-0 w-14 py-2 rounded-xl border text-center transition-colors ${date === d.dateString
                ? 'bg-[#251B17] text-white border-[#251B17]'
                : 'bg-white text-[#29231F] border-[rgba(37,27,23,0.15)] hover:border-[#C7A15D]'}`}
            >
              <span className="block text-[10px] uppercase">{d.dayName}</span>
              <span className="block text-lg font-semibold leading-tight">{d.dayNumber}</span>
              <span className="block text-[10px]">{d.monthName}</span>
            </button>
          ))}
        </div>
      </div>

      {date && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7C736D]">Horário</p>
          {slotsLoading && <p className="text-sm text-[#756B65]" role="status">Buscando horários livres...</p>}
          {!slotsLoading && slotsError && (
            <p className="text-sm text-red-600">
              {slotsError}{' '}
              <button onClick={() => setReload(n => n + 1)} className="underline">Tentar de novo</button>
            </p>
          )}
          {!slotsLoading && !slotsError && slots.length === 0 && (
            <p className="text-sm text-[#756B65]">Nenhum horário livre neste dia. Escolha outro dia{proChoice !== ANY ? ' ou "Qualquer profissional"' : ''}.</p>
          )}
          {!slotsLoading && slots.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {slots.map(slot => {
                const current = isCurrent(slot);
                const selected = picked?.time === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={current}
                    onClick={() => setPicked({ time: slot.time, professionalId: assign(slot) })}
                    aria-pressed={selected}
                    title={current ? 'Este é o seu horário atual' : undefined}
                    className={`h-10 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selected
                      ? 'bg-[#251B17] text-white border-[#251B17]'
                      : 'bg-white text-[#29231F] border-[rgba(37,27,23,0.15)] hover:border-[#C7A15D]'}`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {picked && (
        <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-3">
          <p className="text-sm text-[#29231F]">
            Novo horário: <strong>{capitalize(formatDateLabel(date, 'full'))}</strong>, às <strong>{picked.time}</strong>, com <strong>{nameOf(picked.professionalId)}</strong>.
          </p>
          {saveError && <p className="text-sm text-red-600" role="alert">{saveError}</p>}
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full h-12 rounded-xl bg-[#251B17] hover:bg-[#1a120e] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Remarcando...' : 'Confirmar remarcação'}
          </button>
        </div>
      )}
      {!picked && saveError && <p className="text-sm text-red-600" role="alert">{saveError}</p>}
    </div>
  );
}

function CancelPanel({ token, booking, onBack, onDone }: {
  token: string; booking: ManagedBooking; onBack: () => void; onDone: (before: ManagedBooking, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    setSaving(true);
    setError('');
    const result = await clientCancelBooking(token, reason);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    await onDone(booking, reason.trim());
  };

  return (
    <div className="bg-white rounded-2xl border border-[rgba(37,27,23,0.09)] shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-[#29231F]">Cancelar agendamento?</h2>
      <p className="text-sm text-[#5A514B]">O horário fica livre para outra cliente. Se quiser, conte o motivo (opcional):</p>
      <textarea
        rows={3}
        maxLength={300}
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Ex.: tive um imprevisto"
        aria-label="Motivo do cancelamento (opcional)"
        className="w-full p-3 border border-[rgba(37,27,23,0.12)] rounded-xl text-sm focus:outline-none focus:border-[#C7A15D] resize-none"
      />
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 h-12 rounded-xl border border-[#DDD6CC] text-sm text-[#29231F] hover:bg-black/5">Voltar</button>
        <button onClick={handleCancel} disabled={saving} className="flex-1 h-12 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-semibold disabled:opacity-60">
          {saving ? 'Cancelando...' : 'Sim, cancelar'}
        </button>
      </div>
    </div>
  );
}
