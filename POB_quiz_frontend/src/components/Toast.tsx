// src/components/Toast.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
};

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  // Set styles based on toast type
  const bgColor = type === 'success' 
    ? 'bg-[#94C751]/10 border-[#94C751]/30 text-[#C9E3A8]'
    : type === 'error'
      ? 'bg-[#ff6b6b]/10 border-[#ff6b6b]/30 text-[#ff6b6b]'
      : 'bg-[#ffd166]/10 border-[#ffd166]/30 text-[#ffd166]';
      
  const iconColor = type === 'success' 
    ? 'text-[#94C751]'
    : type === 'error'
      ? 'text-[#ff6b6b]'
      : 'text-[#ffd166]';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 p-3 rounded-lg border ${bgColor} max-w-xs shadow-lg`}
        >
          <div className="flex items-start gap-2">
            <div className="shrink-0 mt-0.5">
              {type === 'success' ? (
                <CheckCircle2 className={`w-5 h-5 ${iconColor}`} />
              ) : type === 'error' ? (
                <XCircle className={`w-5 h-5 ${iconColor}`} />
              ) : (
                <span className="text-lg">ℹ️</span>
              )}
            </div>
            <div className="flex-1">{message}</div>
            <button 
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="shrink-0 mt-0.5 text-highlight/60 hover:text-highlight transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast Container to manage multiple toasts
type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // Expose the addToast function globally
  useEffect(() => {
    (window as any).addToast = (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, { id, message, type }]);
    };
    
    return () => {
      delete (window as any).addToast;
    };
  }, []);
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}