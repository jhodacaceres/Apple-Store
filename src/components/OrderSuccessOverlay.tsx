import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';

interface Props {
  onDone: () => void;
}

export default function OrderSuccessOverlay({ onDone }: Props) {
  const [phase, setPhase] = useState<'sending' | 'success'>('sending');
  const shouldReduceMotion = useReducedMotion();

  const fireConfetti = useCallback(() => {
    if (shouldReduceMotion) return;
    confetti({
      particleCount: 70,
      spread: 55,
      origin: { y: 0.55 },
      colors: ['#25D366', '#ffffff', '#128C7E', '#34C759', '#DCF8C6'],
      disableForReducedMotion: true,
    });
  }, [shouldReduceMotion]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('success');
      fireConfetti();
    }, 900);
    return () => clearTimeout(t);
  }, [fireConfetti]);

  useEffect(() => {
    if (phase !== 'success') return;
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-[#141414] border border-white/[0.08] rounded-3xl p-8 flex flex-col items-center gap-5 w-full max-w-xs mx-4 shadow-2xl"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 320, damping: 28 }
        }
      >
        {phase === 'sending' ? (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-white/[0.08] border-t-[#25D366] animate-spin" />
            <p className="text-white/70 font-medium text-sm text-center">
              Preparando tu pedido…
            </p>
          </>
        ) : (
          <>
            <motion.div
              className="w-16 h-16 rounded-full bg-[#25D366]/15 border border-[#25D366]/25 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 420, damping: 18 }
              }
            >
              <svg
                className="w-8 h-8 text-[#25D366]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            <div className="text-center">
              <motion.p
                className="text-white font-bold text-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1 }}
              >
                ¡Pedido enviado!
              </motion.p>
              <motion.p
                className="text-white/40 text-sm mt-1.5 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.22 }}
              >
                Gracias por tu compra.
                <br />
                Te respondemos enseguida por WhatsApp.
              </motion.p>
            </div>

            <motion.div
              className="flex items-center gap-1.5 text-white/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.5 }}
            >
              <div className="w-3 h-3 rounded-full border border-t-transparent border-white/20 animate-spin" />
              <span className="text-xs">Abriendo WhatsApp…</span>
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
