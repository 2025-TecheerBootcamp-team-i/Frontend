import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = "success", onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: "bg-[#AFDEE2]",
    error: "bg-[#E4524D]",
    info: "bg-[#4d4d4d]",
  }[type];

  const textColor = {
    success: "text-[#1d1d1d]",
    error: "text-[#F6F6F6]",
    info: "text-[#F6F6F6]",
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`
        ${bgColor} ${textColor}
        px-6 py-3 rounded-2xl
        shadow-[0_4px_12px_rgba(0,0,0,0.3)]
        flex items-center gap-3
        max-w-md
        pointer-events-auto
      `}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-70 transition-opacity"
        aria-label="닫기"
      >
        ✕
      </button>
    </motion.div>
  );
}

export interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: "success" | "error" | "info";
  }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
