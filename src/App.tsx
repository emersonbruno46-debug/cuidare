// ─────────────────────────────────────────────
// CUIDARE — App.tsx (com React Router & Lazy Loading)
// ─────────────────────────────────────────────

import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { Service } from './types';
import LandingPage from './components/LandingPage';
import BookingModal from './components/BookingModal';
import { getSession, seedDefaultAccounts } from './lib/auth';
import { seedDemoData, getProfessionals, getBookings, createBooking } from './lib/dataService';
import { professionals as staticProfessionals } from './data/professionalsData';

// Code-split admin and access modules for performance
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const AccessPage = lazy(() => import('./pages/AccessPage'));
const AdminLoginPage = lazy(() => import('./pages/LoginPages').then(m => ({ default: m.AdminLoginPage })));
const CollaboratorLoginPage = lazy(() => import('./pages/LoginPages').then(m => ({ default: m.CollaboratorLoginPage })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#F7F5F1] flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#C7A15D] border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs uppercase tracking-widest text-[#7C736D] font-semibold block">Carregando painel Cuidare...</span>
      </div>
    </div>
  );
}

// ── Route guards
function AdminRoute() {
  const session = getSession();
  if (!session) return <Navigate to="/admin/login" replace />;
  if (session.user.role !== 'admin') return <Navigate to="/colaboradora" replace />;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPanel currentUser={session.user} />
    </Suspense>
  );
}

function CollaboratorRoute() {
  const session = getSession();
  if (!session) return <Navigate to="/colaboradora/login" replace />;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPanel currentUser={session.user} />
    </Suspense>
  );
}

// ── Main app wrapper
function AppRoutes() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState<Service | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  // Seed default data on first load
  useEffect(() => {
    seedDefaultAccounts();
    seedDemoData();
  }, []);

  // Close booking modal on route change
  useEffect(() => {
    setBookingOpen(false);
  }, [location.pathname]);

  const openBooking = (service?: Service) => {
    setPreselectedService(service);
    setBookingOpen(true);
  };

  const session = getSession();

  // Get live professionals and bookings from data service
  const liveProfessionals = getProfessionals().length > 0
    ? getProfessionals()
    : staticProfessionals;

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public */}
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

          {/* Access & Auth */}
          <Route path="/acesso" element={<AccessPage />} />
          <Route path="/admin/login" element={
            session?.user?.role === 'admin' ? <Navigate to="/admin" replace /> : <AdminLoginPage />
          } />
          <Route path="/colaboradora/login" element={
            session?.user?.role === 'collaborator' ? <Navigate to="/colaboradora" replace /> : <CollaboratorLoginPage />
          } />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute key={refreshKey} />} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

          {/* Collaborator routes */}
          <Route path="/colaboradora" element={<CollaboratorRoute key={refreshKey} />} />
          <Route path="/colaboradora/*" element={<Navigate to="/colaboradora" replace />} />

          {/* Legacy fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Global booking modal */}
      {bookingOpen && (
        <BookingModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          professionals={liveProfessionals}
          initialService={preselectedService}
          existingBookings={getBookings()}
          onAddBooking={(b) => {
            const result = createBooking(b);
            if (result.booking) {
              setRefreshKey(prev => prev + 1);
            }
            return result;
          }}
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
