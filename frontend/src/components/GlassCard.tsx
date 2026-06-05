import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'blue' | 'green' | 'orange' | 'red' | 'none';
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  onClick,
  hoverEffect = true,
}) => {
  const glowStyles = {
    none: 'border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] bg-brand-surface/65',
    blue: 'border-brand-blue/30 shadow-glow-blue bg-brand-surface/70',
    green: 'border-brand-green/30 shadow-glow-green bg-brand-surface/70',
    orange: 'border-brand-orange/30 shadow-glow-orange bg-brand-surface/70',
    red: 'border-brand-red/30 shadow-glow-red bg-brand-surface/75 animate-pulse-glow-red',
  };

  const cardVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={hoverEffect ? "hover" : undefined}
      onClick={onClick}
      className={`backdrop-blur-xl border rounded-2xl p-6 transition-colors duration-300 cursor-pointer ${glowStyles[glowColor]} ${className}`}
    >
      {children}
    </motion.div>
  );
};
