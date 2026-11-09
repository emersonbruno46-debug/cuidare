// ─────────────────────────────────────────────
// CUIDARE — App.tsx (rotas, login e carregamento dos dados)
// ─────────────────────────────────────────────

import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { Service, Professional } from './types';
import LandingPage from './components/LandingPage';
import BookingModal from './components/BookingModal';
import { initAuth, useAuth } from './lib/auth';
import { loadPublicData, getProfessionals, useDataVersion, clearLegacyLocalData } from './lib/dataService';

// Painel e login carregam só quando alguém abre essas páginas
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const AccessPage = lazy(() => import('./pages/AccessPage'));
const AdminLoginPage = lazy(() => import('./pages/LoginPages').then(m => ({ default: m.AdminLoginPage })));
const CollaboratorLoginPage = lazy(() => import('./pages/LoginPages').then(m => ({ default: m.CollaboratorLoginPage })));

function LoadingFallback({ label = 'Carregando painel Cuidare...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#F7F5F1] flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#C7A15D] border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs uppercase tracking-widest text-[#7C736D] font-semibold block">{label}</span>
      </div>
    </div>
  );
}

// ── Proteção das páginas do painel
function AdminRoute() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingFallback label="Verificando acesso..." />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/colaboradora" replace />;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPanel currentUser={user} />
    </Suspense>
  );
}

function CollaboratorRoute() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingFallback label="Verificando acesso..." />;
  if (!user) return <Navigate to="/colaboradora/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPanel currentUser={user} />
    </Suspense>
  );
}

function LoginRoute({ role }: { role: 'admin' | 'collaborator' }) {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingFallback label="Verificando acesso..." />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/colaboradora'} replace />;
  return role === 'admin' ? <AdminLoginPage /> : <CollaboratorLoginPage />;
}

// ── Site público + rotas
function AppRoutes() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState<Service | undefined>(undefined);
  const [preselectedProfessional, setPreselectedProfessional] = useState<Professional | undefined>(undefined);
  const location = useLocation();
  useDataVersion(); // redesenha quando a equipe e o horário chegam do banco

  useEffect(() => {
    clearLegacyLocalData();
    initAuth();
    loadPublicData().catch(() => { /* sem internet: o site usa os dados padrão */ });
  }, []);

  // Fecha o agendamento ao trocar de página
  useEffect(() => {
    setBookingOpen(false);
  }, [location.pathname]);

  const openBooking = (options?: { service?: Service; professional?: Professional } | Service) => {
    if (!options) {
      setPreselectedService(undefined);
      setPreselectedProfessional(undefined);
    } else if ('id' in options && 'priceBase' in options) {
      setPreselectedService(options);
      setPreselectedProfessional(undefined);
    } else {
      const opts = options as { service?: Service; professional?: Professional };
      setPreselectedService(opts.service);
      setPreselectedProfessional(opts.professional);
    }
    setBookingOpen(true);
  };

  // No site só aparecem as profissionais que estão na equipe
  const liveProfessionals = getProfessionals().filter(p => p.active !== false);

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Público */}
          <Route
            path="/"
            element={
              <LandingPage
                onOpenBooking={openBooking}
                onNavigateToAdmin={() => { window.location.href = '/acesso'; }}
                professionals={liveProfessionals}
              />
            }
          />

          {/* Acesso e login */}
          <Route path="/acesso" element={<AccessPage />} />
          <Route path="/admin/login" element={<LoginRoute role="admin" />} />
          <Route path="/colaboradora/login" element={<LoginRoute role="collaborator" />} />

          {/* Painel */}
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="/colaboradora" element={<CollaboratorRoute />} />
          <Route path="/colaboradora/*" element={<Navigate to="/colaboradora" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {bookingOpen && (
        <BookingModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          professionals={liveProfessionals}
          initialService={preselectedService}
          initialProfessional={preselectedProfessional}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
