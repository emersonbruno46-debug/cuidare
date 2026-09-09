// ─────────────────────────────────────────────
// CUIDARE — Tela de Acesso Restrito
// Ponto de entrada: escolha entre Admin e Colaboradora
// ─────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Users } from 'lucide-react';

const Logo = () => (
  <svg className="h-8 w-auto text-champagne" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29700 21000" fill="currentColor">
    <path className="fill-current" d="M6217.41 17444.27c-189.15,329.07 -548.76,532.63 -1003.39,532.63 -410.49,0 -736.19,-131.46 -972.84,-391.85 -236.63,-259.54 -355.36,-616.61 -355.36,-1074.61 0,-455.47 118.73,-815.09 355.36,-1074.62 236.65,-260.39 560.04,-405.86 967.76,-391.86 568.85,19.53 1139.94,837.17 1139.94,589.47l0 -14.42c0,-247.66 -134.02,-465.64 -399.5,-653.92 -268.01,-186.6 -603.89,-280.75 -1004.23,-280.75 -539.41,0 -994.87,176.42 -1360.45,528.41 -364.69,351.99 -548.74,785.39 -548.74,1302.77 0,522.46 186.6,955.88 558.93,1300.23 372.35,346.91 827.81,520.77 1365.55,520.77 325.69,0 614.06,-64.46 869.36,-195.93 253.59,-128.92 436.8,-297.71 548.75,-502.95l-161.14 -193.37z" />
  </svg>
);

export default function AccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F5F0] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(199,161,93,0.05)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-serif text-[#251B17] mb-2">Acesso Restrito</h1>
          <p className="text-sm text-[#756B65]">Selecione o tipo de acesso para continuar</p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/admin/login')}
            className="w-full bg-[#251B17] text-white p-5 rounded-xl flex items-center gap-4 text-left hover:bg-[#1a120e] transition-colors group"
          >
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
              <Lock size={22} className="text-[#C7A15D]" />
            </div>
            <div>
              <div className="font-semibold text-white text-base leading-tight">Sou Administradora</div>
              <div className="text-[13px] text-white/60 mt-0.5">Acesso completo ao painel de gestão</div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/colaboradora/login')}
            className="w-full bg-white border border-[rgba(37,27,23,0.12)] p-5 rounded-xl flex items-center gap-4 text-left hover:border-[#C7A15D]/40 hover:bg-[#FBF8F4] transition-colors group"
          >
            <div className="w-12 h-12 rounded-lg bg-[#F1EBE4] flex items-center justify-center shrink-0 group-hover:bg-[#F1E6D0] transition-colors">
              <Users size={22} className="text-[#786A61]" />
            </div>
            <div>
              <div className="font-semibold text-[#251B17] text-base leading-tight">Sou Colaboradora</div>
              <div className="text-[13px] text-[#756B65] mt-0.5">Acesse sua agenda e atendimentos</div>
            </div>
          </motion.button>
        </div>

        {/* Back to site */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-[13px] text-[#756B65] hover:text-[#251B17] transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar ao site
          </button>
        </div>
      </motion.div>
    </div>
  );
}
