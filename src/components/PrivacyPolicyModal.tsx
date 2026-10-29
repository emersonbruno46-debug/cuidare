// ─────────────────────────────────────────────
// CUIDARE — Privacy Policy & Terms Modal
// Termos de agendamento, LGPD e cancelamento
// ─────────────────────────────────────────────

import { useEffect } from 'react';
import { X, Shield, Clock, Calendar, Check } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="w-full max-w-xl bg-[#FAF8F5] border border-[#E6DFD5] rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start pb-4 border-b border-[#E6DFD5]">
          <div>
            <h3 id="privacy-modal-title" className="text-xl font-serif text-[#29231F] font-bold">
              Privacidade e Política de Agendamento
            </h3>
            <span className="text-xs text-[#7C736D] uppercase tracking-wider block mt-0.5">
              Cuidare Espaço de Beleza & Saúde
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#7C736D] hover:text-[#29231F] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
            aria-label="Fechar termos de privacidade"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 text-sm text-[#5C534D] leading-relaxed">
          <section className="space-y-2">
            <h4 className="font-semibold text-[#29231F] flex items-center gap-2 text-base">
              <Shield size={18} className="text-[#C7A15D]" /> 1. Uso dos seus Dados (LGPD)
            </h4>
            <p>
              Os dados coletados neste site (nome, número de WhatsApp e e-mail) são utilizados <strong>exclusivamente para processamento da sua solicitação de agendamento</strong>, confirmação de horário e envio de lembretes antes do atendimento.
            </p>
            <p>
              Não compartilhamos, vendemos ou utilizamos suas informações para finalidades estranhas ao seu atendimento no Espaço Cuidare.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-[#29231F] flex items-center gap-2 text-base">
              <Calendar size={18} className="text-[#C7A15D]" /> 2. Confirmação do Horário
            </h4>
            <p>
              O agendamento realizado pelo site registra sua reserva no sistema interno. A recepção do Cuidare entrará em contato via WhatsApp para confirmar o horário e tirar dúvidas preliminares.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-[#29231F] flex items-center gap-2 text-base">
              <Clock size={18} className="text-[#C7A15D]" /> 3. Cancelamentos e Remarcações
            </h4>
            <p>
              Compreendemos que imprevistos acontecem. Solicitamos que cancelamentos ou remarcações sejam informados à recepção ou à profissional com <strong>pelo menos 2 horas de antecedência</strong>, permitindo que outra cliente seja atendida.
            </p>
            <p>
              Tolerância de atraso: até 15 minutos, para que o atendimento da próxima cliente não seja comprometido.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-[#29231F] flex items-center gap-2 text-base">
              <Check size={18} className="text-[#C7A15D]" /> 4. Avaliação e Procedimentos Especiais
            </h4>
            <p>
              Procedimentos químicos capilares (mechas, alisamentos) e pacotes de noivas dependem de avaliação prévia dos fios e teste de mecha para garantir a saúde capilar e segurança do procedimento.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[#E6DFD5] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#29231F] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#3D342E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
