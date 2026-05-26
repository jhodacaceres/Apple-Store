import { MessageSquare } from 'lucide-react';

interface ContactProps {
  contactPhone: string;
  whatsappMessage: string;
}

export default function Contact({ contactPhone, whatsappMessage }: ContactProps) {
  // Limpiamos el número (quitamos espacios, símbolos raros) para la URL de WhatsApp
  const whatsappNumber = contactPhone.replace(/[^\d+]/g, '');
  
  // Transformamos el mensaje para que sea válido en una URL (cambia espacios por %20, etc)
  const encodedMessage = encodeURIComponent(whatsappMessage);
  
  // Usamos el número limpio y el mensaje codificado
  const whatsappUrl = `https://wa.me/+591${whatsappNumber.replace('+', '')}?text=${encodedMessage}`;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-white font-sans flex items-center justify-center pb-24 md:pb-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
            Hablemos
          </h1>
          <p className="text-lg text-gray-500">
            Contáctanos directamente por WhatsApp para una atención rápida y personalizada.
          </p>
        </div>

        <div className="bg-[#f5f5f7] p-8 md:p-12 rounded-3xl border border-gray-100 flex flex-col items-center">
          
          {/* Vista previa del mensaje tipo burbuja de chat */}
          <div className="w-full max-w-sm mb-8 flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Vista previa de tu mensaje
            </span>
            <div className="w-full flex justify-end">
              <div className="bg-[#E7FFDB] text-[#111b21] p-4 rounded-2xl rounded-tr-sm shadow-sm inline-block text-left relative border border-[#c3eca8]">
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                  {whatsappMessage}
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-full border-t border-gray-200 pt-8 text-center flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-4">
              Te responderemos al número: <span className="font-bold text-gray-700">{contactPhone}</span>
            </p>
            
            <a 
              href={whatsappUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-full font-bold hover:bg-[#1DA851] transition-all shadow-md hover:shadow-lg text-base"
            >
              <MessageSquare className="w-5 h-5 fill-current" /> 
              Enviar mensaje
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}