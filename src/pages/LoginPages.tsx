// ─────────────────────────────────────────────
// CUIDARE — Login da Administradora
// ─────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { signIn } from '../lib/auth';

const Logo = () => (
  <svg className="h-7 w-auto text-[#251B17]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29700 21000" fill="currentColor">
    <path d="M6217.41 17444.27c-189.15,329.07 -548.76,532.63 -1003.39,532.63 -410.49,0 -736.19,-131.46 -972.84,-391.85 -236.63,-259.54 -355.36,-616.61 -355.36,-1074.61 0,-455.47 118.73,-815.09 355.36,-1074.62 236.65,-260.39 560.04,-405.86 967.76,-391.86 568.85,19.53 1139.94,837.17 1139.94,589.47l0 -14.42c0,-247.66 -134.02,-465.64 -399.5,-653.92 -268.01,-186.6 -603.89,-280.75 -1004.23,-280.75 -539.41,0 -994.87,176.42 -1360.45,528.41 -364.69,351.99 -548.74,785.39 -548.74,1302.77 0,522.46 186.6,955.88 558.93,1300.23 372.35,346.91 827.81,520.77 1365.55,520.77 325.69,0 614.06,-64.46 869.36,-195.93 253.59,-128.92 436.8,-297.71 548.75,-502.95l-161.14 -193.37z" />
  </svg>
);

interface LoginPageProps {
  role: 'admin' | 'collaborator';
}

export function LoginPage({ role }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    const { user, error: authError } = await signIn(email.trim(), password);
    setLoading(false);

    if (authError || !user) {
      setError(authError ?? 'Credenciais inválidas.');
      return;
    }

    if (isAdmin && user.role !== 'admin') {
      setError('Este acesso é exclusivo para administradoras.');
      return;
    }
    if (!isAdmin && user.role !== 'collaborator') {
      setError('Este acesso é exclusivo para colaboradoras.');
      return;
    }

    navigate(isAdmin ? '/admin' : '/colaboradora');
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(199,161,93,0.05)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white border border-[rgba(37,27,23,0.1)] rounded-2xl p-8 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-[#251B17]' : 'bg-[#F1EBE4]'}`}>
              <Lock size={18} className={isAdmin ? 'text-[#C7A15D]' : 'text-[#786A61]'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Logo />
                <span className="font-serif font-bold text-sm tracking-widest text-[#251B17]">CUIDARE</span>
              </div>
              <p className="text-xs text-[#756B65] mt-0.5">
                {isAdmin ? 'Painel da Administradora' : 'Área da Colaboradora'}
              </p>
            </div>
          </div>

          <h1 className="text-xl font-serif text-[#251B17] mb-6">
            {isAdmin ? 'Bem-vinda, Lane.' : 'Bem-vinda de volta.'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={isAdmin ? 'lane@cuidare.com.br' : 'seunome@cuidare.com.br'}
                autoComplete="email"
                className="w-full h-11 px-4 bg-[#F8F5F0] border border-[rgba(37,27,23,0.12)] rounded-lg text-sm text-[#251B17] placeholder-[#A09890] focus:outline-none focus:border-[#C7A15D] focus:bg-white transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 pl-4 pr-11 bg-[#F8F5F0] border border-[rgba(37,27,23,0.12)] rounded-lg text-sm text-[#251B17] placeholder-[#A09890] focus:outline-none focus:border-[#C7A15D] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#756B65] hover:text-[#251B17] transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-11 rounded-lg font-semibold text-sm transition-all ${
                loading
                  ? 'bg-[#756B65] text-white cursor-wait'
                  : isAdmin
                    ? 'bg-[#251B17] text-white hover:bg-[#1a120e] active:scale-[0.99]'
                    : 'bg-[#C7A15D] text-white hover:bg-[#a87d37] active:scale-[0.99]'
              }`}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-3 bg-[#F8F5F0] rounded-lg border border-[rgba(37,27,23,0.08)]">
            <p className="text-[11px] text-[#756B65] text-center">
              {isAdmin
                ? <><strong>Demo:</strong> lane@cuidare.com.br / cuidare2024admin</>
                : <><strong>Demo:</strong> railma@cuidare.com.br / cuidare2024</>
              }
            </p>
          </div>
        </div>

        {/* Back */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/acesso')}
            className="inline-flex items-center gap-2 text-[13px] text-[#756B65] hover:text-[#251B17] transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar às opções de acesso
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AdminLoginPage() {
  return <LoginPage role="admin" />;
}

export function CollaboratorLoginPage() {
  return <LoginPage role="collaborator" />;
}
