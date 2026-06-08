import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, DeviceMobile, Truck } from '@phosphor-icons/react';

const features = [
  {
    Icon: ShieldCheck,
    title: 'Garantía Asegurada',
    desc: 'Revisión técnica en cada equipo antes de la venta.',
  },
  {
    Icon: DeviceMobile,
    title: 'iPhones Originales',
    desc: '100% desbloqueados con IMEI verificado y certificado.',
  },
  {
    Icon: Truck,
    title: 'Envío en Bolivia',
    desc: 'Delivery a La Paz, Cochabamba y Santa Cruz.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="bg-[#0A0A0A]">

      {/* VIDEO HERO */}
      <section className="relative min-h-[100dvh] flex items-end overflow-hidden pb-20 md:pb-0">

        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/hero-bg.mp4"
        />

        <div
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <motion.div
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="max-w-2xl"
          >
            <motion.h1
              variants={shouldReduceMotion ? {} : fadeUp}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none text-white"
            >
              Tu próximo iPhone.
            </motion.h1>

            <motion.p
              variants={shouldReduceMotion ? {} : fadeUp}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mt-6 text-lg text-white/70 max-w-md leading-relaxed"
            >
              Equipos originales desbloqueados. Garantía asegurada. Entrega en Bolivia.
            </motion.p>

            <motion.div
              variants={shouldReduceMotion ? {} : fadeUp}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center bg-white text-zinc-950 px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all duration-200"
              >
                Ver Catálogo
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center border border-white/40 text-white px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/10 hover:border-white/60 active:scale-[0.98] transition-all duration-200"
              >
                Contactar
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="bg-[#1C1C1E] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {features.map(({ Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.5,
                  delay: shouldReduceMotion ? 0 : i * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="px-4 md:px-8 py-10"
              >
                <Icon size={32} weight="light" className="text-white/70 mb-5" />
                <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
