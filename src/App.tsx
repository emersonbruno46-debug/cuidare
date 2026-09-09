// ─────────────────────────────────────────────
// CUIDARE — App.tsx (com React Router)
// ─────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { Service } from './types';
import LandingPage from './components/LandingPage';
import BookingModal from './components/BookingModal';
import AdminPanel from './components/AdminPanel';
import AccessPage from './pages/AccessPage';
import { AdminLoginPage, CollaboratorLoginPage } from './pages/LoginPages';
import { getSession, seedDefaultAccounts } from './lib/auth';
import { seedDemoData, getProfessionals, getBookings, createBooking } from './lib/dataService';
import { professionals as staticProfessionals } from './data/professionalsData';

// ── Route guards
function AdminRoute() {
  const session = getSession();
  if (!session) return <Navigate to="/admin/login" replace />;
  if (session.user.role !== 'admin') return <Navigate to="/colaboradora" replace />;
  return <AdminPanel currentUser={session.user} />;
}

function CollaboratorRoute() {
  const session = getSession();
  if (!session) return <Navigate to="/colaboradora/login" replace />;
  return <AdminPanel currentUser={session.user} />;
}

// ── Main app wrapper (reads session for admin panels)
function AppRoutes() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState<Service | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  // Seed data on first load
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

  // Get live professionals and bookings from data service (falls back to static)
  const liveProfessionals = getProfessionals().length > 0
    ? getProfessionals()
    : staticProfessionals;

  return (
    <>
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

      {/* Global booking modal */}
      {bookingOpen && (
        <BookingModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          professionals={liveProfessionals}
          initialService={preselectedService}
          existingBookings={getBookings()}
          onAddBooking={(b) => {
            createBooking(b);
            setRefreshKey(prev => prev + 1);
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
