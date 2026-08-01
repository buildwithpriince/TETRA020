import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ArrowLinkProps {
  to: string;
  children: ReactNode;
  variant?: 'ink' | 'red' | 'muted';
  external?: boolean;
  onClick?: () => void;
}

const colors = {
  ink: 'text-ink hover:text-redink',
  red: 'text-redink hover:text-redink-dark',
  muted: 'text-ink-muted hover:text-ink',
};

export function ArrowLink({ to, children, variant = 'ink', external, onClick }: ArrowLinkProps) {
  const cls = `group inline-flex items-center gap-1.5 font-medium text-[15px] ${colors[variant]} transition-colors`;
  const icon = (
    <motion.span
      className="inline-block"
      initial={false}
      whileHover={{ x: 3 }}
    >
      <ArrowRight size={16} strokeWidth={2.2} className="transition-transform group-hover:translate-x-0.5" />
    </motion.span>
  );

  if (external) {
    return (
      <a href={to} className={cls} onClick={onClick}>
        {children}
        {icon}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} onClick={onClick}>
      {children}
      {icon}
    </Link>
  );
}
