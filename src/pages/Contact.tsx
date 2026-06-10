import { WhatsappLogo } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { useState, useCallback } from 'react';
import OrderSuccessOverlay from '../components/OrderSuccessOverlay';
import { trackWhatsappClick } from '../lib/analytics';

interface ContactProps {
  contactPhone: string;
  whatsappMessage: string;
}

export default function Contact({ contactPhone, whatsappMessage }: ContactProps) {
  const location = useLocation();
  const prefill = (location.state as { prefillMessage?: string } | null)?.prefillMessage;
  const activeMessage = prefill ? decodeURIComponent(prefill) : whatsappMessage;

  const whatsappNumber = contactPhone.replace(/[^\d+]/g, '');
  const encodedMessage = prefill ?? encodeURIComponent(whatsappMessage);
  const whatsappUrl = `https://wa.me/+591${whatsappNumber.replace('+', '')}?text=${encodedMessage}`;

  const [sending, setSending] = useState(false);

  const handleSend = () => {
    trackWhatsappClick('contact');
    window.open(whatsappUrl, '_blank');
    setSending(true);
  };

  const handleDone = useCallback(() => {
    setSending(false);
  }, []);

  return (
    <>
      {sending && <OrderSuccessOverlay onDone={handleDone} />}
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center pb-24 md:pb-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 md:py-20 w-full">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-3 animate-fade-in-up">
            Hablemos
          </h1>
          <p className="text-base text-white/40 animate-fade-in-up animate-delay-100">
            Contáctanos por WhatsApp para una atención rápida y personalizada.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1C1C1E] rounded-3xl border border-white/[0.08] overflow-hidden animate-fade-in-up animate-delay-200">

          {/* Zona de burbuja de chat */}
          <div className="p-6 sm:p-8 bg-[#1A2820] relative">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='%23FAFAFA'/%3E%3C/svg%3E")`,
              }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/25 block mb-3 relative">
              Vista previa de tu mensaje
            </span>
            <div className="flex justify-end relative">
              <div className="bg-[#DCF8C6] text-[#111b21] p-4 rounded-2xl rounded-tr-none shadow-sm inline-block text-left max-w-[88%] border border-[#b8e4a6]/60">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeMessage}</p>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-[10px] text-gray-400">ahora</span>
                  <svg className="w-4 h-4 text-[#53BDEB]" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
                    <path d="M17.394 1.556a.75.75 0 0 0-1.038-1.083L9.5 7.114 6.72 4.44a.75.75 0 0 0-1.04 1.083l3.28 3.143a.75.75 0 0 0 1.04 0l7.394-7.11z" />
                    <path d="M12.894 1.556a.75.75 0 0 0-1.038-1.083L5 7.114 2.22 4.44A.75.75 0 0 0 1.18 5.523l3.28 3.143a.75.75 0 0 0 1.04 0l7.394-7.11z" opacity=".45" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Zona del botón */}
          <div className="p-6 sm:p-8 flex flex-col items-center gap-4">
            <p className="text-sm text-white/40">
              Responderemos al número: <span className="font-bold text-white">{contactPhone}</span>
            </p>
            <div className="relative inline-flex w-full sm:w-auto justify-center">
              <span
                className="absolute inset-0 rounded-full"
                style={{ animation: 'pulse-ring 2.5s ease-out infinite' }}
                aria-hidden="true"
              />
              <button
                onClick={handleSend}
                className="relative w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-full font-bold hover:bg-[#1DA851] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base active:scale-[0.98]"
              >
                <WhatsappLogo className="w-5 h-5" weight="fill" />
                Enviar mensaje por WhatsApp
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}
