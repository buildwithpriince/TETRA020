import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { IS_MOCK } from '@/api/client';

const NAV = [
  { label: 'Overview', to: '/' },
  { label: 'Upload', to: '/upload' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];

function Wordmark() {
  return (
    <Link to="/" className="flex flex-col leading-none">
      <span className="font-display text-[22px] font-semibold tracking-tight text-ink">
        Prism
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mt-0.5">
        Diligence, made consistent
      </span>
    </Link>
  );
}

function AuthControl({ compact = false }: { compact?: boolean }) {
  const { user, displayName, photoURL, signInWithGoogle, signOut, enabled } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="inline-flex items-center gap-2 rounded-md border border-rule bg-paper-tint px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-paper-shade"
        title={enabled ? 'Sign in with Google' : 'Demo sign-in (Firebase not configured)'}
      >
        <GoogleIcon />
        {compact ? 'Sign in' : 'Sign in with Google'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md border border-rule bg-paper-tint px-2 py-1 transition-colors hover:border-ink/20"
      >
        {photoURL ? (
          <img src={photoURL} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper">
            {(displayName ?? 'A').slice(0, 1).toUpperCase()}
          </span>
        )}
        {!compact && (
          <span className="max-w-[100px] truncate text-[13px] font-medium text-ink">
            {displayName}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-rule bg-paper-tint shadow-card"
            >
              <div className="border-b border-rule px-3 py-2">
                <p className="truncate text-[12px] font-medium text-ink">{displayName}</p>
                <p className="truncate text-[11px] text-ink-muted">{enabled ? 'Signed in via Google' : 'Demo session'}</p>
              </div>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="block w-full px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-paper-shade"
              >
                Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export function NavBar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-ledger items-center justify-between px-5 lg:px-8">
        <Wordmark />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative rounded-md px-3 py-1.5 text-[14px] font-medium transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-[1px] h-[2px] bg-redink"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <AuthControl />
          </div>
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md border border-rule p-1.5 text-ink"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-rule bg-paper md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-3">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2 text-[15px] ${
                    location.pathname === item.to ? 'bg-paper-shade font-medium text-ink' : 'text-ink-muted'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-rule pt-3">
                <AuthControl compact />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-rule bg-paper-shade">
      <div className="mx-auto max-w-ledger px-5 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-semibold text-ink">Prism</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                Diligence, made consistent
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-muted">
              Prism checks consistency and completeness of fundraising documents only. It does not
              value the company or give investment advice.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Product</p>
            <ul className="mt-3 space-y-2 text-[14px]">
              <li><Link to="/" className="text-ink hover:text-redink">Overview</Link></li>
              <li><Link to="/upload" className="text-ink hover:text-redink">Upload</Link></li>
              <li><Link to="/dashboard" className="text-ink hover:text-redink">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Legal</p>
            <ul className="mt-3 space-y-2 text-[14px]">
              <li><Link to="/privacy" className="text-ink hover:text-redink">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-ink hover:text-redink">Terms &amp; Conditions</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[11px] text-ink-muted">
            © {new Date().getFullYear()} Prism. A hackathon prototype — not investment advice.
          </p>
          {IS_MOCK && (
            <span className="font-mono text-[10px] uppercase tracking-wider rounded-full border border-amber/40 bg-amber-soft px-2.5 py-1 text-amber">
              Demo mode · mock data
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
