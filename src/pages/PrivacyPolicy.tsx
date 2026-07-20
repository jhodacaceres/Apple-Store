import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';

const SECTIONS = [
  {
    title: '1. Quiénes somos',
    body: `Apple Zone es un negocio dedicado a la venta de equipos y accesorios Apple en Cochabamba, Bolivia. Esta política describe qué información recopilamos a través de nuestro sitio web, con qué finalidad la usamos y qué derechos tienes sobre ella.`,
  },
  {
    title: '2. Información que recopilamos',
    body: `Recopilamos los siguientes tipos de información:

• Datos de navegación: páginas visitadas, tiempo de permanencia, tipo de dispositivo (móvil, tablet o escritorio) y sitio de referencia, mediante un identificador anónimo de visitante y de sesión almacenado en tu navegador (localStorage y sessionStorage).
• Datos que nos proporcionas voluntariamente: cuando nos contactas por WhatsApp, el contenido del mensaje y tu número de teléfono quedan registrados en la conversación de WhatsApp, no en nuestros servidores.
• Datos de cuenta (solo personal autorizado): el panel administrativo utiliza autenticación con correo y contraseña, gestionada de forma segura a través de nuestro proveedor de infraestructura (Supabase).

No recopilamos datos de pago ni de tarjetas: todas las compras se coordinan y confirman directamente por WhatsApp.`,
  },
  {
    title: '3. Cómo usamos tu información',
    body: `Usamos la información recopilada para:

• Entender qué productos y páginas generan más interés, y así mejorar el catálogo y la experiencia de compra.
• Medir el rendimiento del sitio (visitas, permanencia, clics hacia WhatsApp).
• Responder tus consultas y coordinar pedidos cuando nos contactas.

No vendemos, alquilamos ni compartimos tu información con terceros para fines publicitarios.`,
  },
  {
    title: '4. Cookies y almacenamiento local',
    body: `El sitio utiliza almacenamiento local del navegador (localStorage y sessionStorage) para mantener un identificador anónimo de visita y sesión, y así evitar contarte como una visita nueva cada vez que navegas entre páginas. No utilizamos cookies de rastreo de terceros ni de publicidad.

Puedes borrar esta información en cualquier momento desde la configuración de tu navegador, sin que esto afecte tu capacidad de usar el sitio.`,
  },
  {
    title: '5. Con quién compartimos información',
    body: `Utilizamos servicios de terceros que actúan como proveedores de infraestructura para operar el sitio:

• Supabase: almacenamiento de datos, autenticación del panel administrativo y registro de analítica.
• WhatsApp / Meta: para la comunicación directa con nuestro equipo de ventas cuando decides contactarnos.

Estos proveedores procesan datos en nuestro nombre y bajo sus propias políticas de privacidad y seguridad.`,
  },
  {
    title: '6. Seguridad',
    body: `Aplicamos medidas razonables de seguridad para proteger la información almacenada, incluyendo acceso restringido al panel administrativo y conexiones cifradas (HTTPS). Ningún sistema es infalible, por lo que no podemos garantizar seguridad absoluta, pero trabajamos activamente para proteger tu información.`,
  },
  {
    title: '7. Tus derechos',
    body: `Puedes solicitarnos en cualquier momento:

• Saber qué información asociada a tu visita conservamos.
• Solicitar la eliminación de tus datos de contacto de nuestros registros.
• Oponerte al uso de tu información para fines de análisis.

Para ejercer cualquiera de estos derechos, contáctanos por WhatsApp desde la sección de contacto de este sitio.`,
  },
  {
    title: '8. Menores de edad',
    body: `Nuestros servicios están dirigidos a personas mayores de 18 años. No recopilamos intencionalmente información de menores de edad.`,
  },
  {
    title: '9. Cambios a esta política',
    body: `Podemos actualizar esta política de privacidad ocasionalmente para reflejar cambios en nuestras prácticas o por requisitos legales. La fecha de la última actualización se indica al final de esta página.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20">

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8 animate-fade-in-up"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="mb-10 animate-fade-in-up animate-delay-100">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
            Política de Privacidad
          </h1>
          <p className="text-sm text-white/40">
            Última actualización: 20 de julio de 2026
          </p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map(({ title, body }, i) => (
            <div
              key={title}
              className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] p-6 sm:p-8 animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            >
              <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/25 mt-10 text-center">
          Si tienes preguntas sobre esta política, contáctanos por WhatsApp a través de la{' '}
          <Link to="/contact" className="underline hover:text-white/50 transition-colors">
            sección de contacto
          </Link>.
        </p>
      </div>
    </div>
  );
}
