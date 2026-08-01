import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from '@/context/AuthContext';
import { SessionProvider } from '@/context/SessionContext';
import { NavBar, Footer } from '@/components/layout/NavBar';
import Overview from '@/pages/Overview';
import Upload from '@/pages/Upload';
import Processing from '@/pages/Processing';
import Dashboard from '@/pages/Dashboard';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Overview />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/processing" element={<Processing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col">
            <NavBar />
            <main className="flex-1">
              <AnimatedRoutes />
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </SessionProvider>
    </AuthProvider>
  );
}
