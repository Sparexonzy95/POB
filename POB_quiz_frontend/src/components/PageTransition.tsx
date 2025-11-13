// src/components/PageTransition.tsx
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type PageTransitionProps = {
  children: ReactNode;
  isVisible: boolean;
  direction?: 'left' | 'right' | 'up' | 'down';
};

// Export named component instead of default
export function PageTransition({
  children,
  isVisible,
  direction = 'right'
}: PageTransitionProps) {
  // Set up different animations based on direction
  const variants = {
    left: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    },
    right: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    up: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    down: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  };
  
  const currentVariant = variants[direction];

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={currentVariant.initial}
          animate={currentVariant.animate}
          exit={currentVariant.exit}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Shimmer loading animation component
export function ShimmerLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-[#1c2a0c] via-[#263711] to-[#1c2a0c] bg-[length:200%_100%] ${className}`}>
      &nbsp;
    </div>
  );
}

// Custom button animation wrapper
export function AnimatedButton({
  children,
  onClick,
  className = '',
  disabled = false
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </motion.button>
  );
}

// Celebration animation
export function Celebration() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="absolute top-1/4 left-1/4">
        <motion.div
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.8],
            rotate: [0, 15, -15, 0],
            y: [0, -50, 0],
          }}
          transition={{ 
            repeat: 3, 
            duration: 0.8,
          }}
          className="text-4xl"
        >
          🎉
        </motion.div>
      </div>
      
      <div className="absolute top-1/3 right-1/3">
        <motion.div
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.8],
            rotate: [0, -15, 15, 0],
            y: [0, -40, 0],
          }}
          transition={{ 
            repeat: 3, 
            duration: 0.7,
            delay: 0.2,
          }}
          className="text-4xl"
        >
          🎊
        </motion.div>
      </div>
      
      <div className="absolute bottom-1/3 left-1/3">
        <motion.div
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.8],
            rotate: [0, 15, -15, 0],
            y: [0, -30, 0],
          }}
          transition={{ 
            repeat: 3, 
            duration: 0.9,
            delay: 0.4,
          }}
          className="text-4xl"
        >
          🏆
        </motion.div>
      </div>
    </div>
  );
}

// Floating score animation
export function FloatingScore({
  score,
  isVisible,
  onComplete
}: {
  score: number;
  isVisible: boolean;
  onComplete: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: 1, y: -40, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          onAnimationComplete={onComplete}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
        >
          <div className="text-4xl font-bold text-[#94C751] drop-shadow-[0_0_10px_rgba(148,199,81,0.8)]">
            +{score} Points!
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}