import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';

const SECTIONS = [
  {
    title: '1. Aceptación de los términos',
    body: `Al acceder y usar este sitio web, aceptas estos Términos de Servicio en su totalidad. Si no estás de acuerdo con alguna parte de estos términos, te pedimos que no utilices el sitio.`,
  },
  {
    title: '2. Descripción del servicio',
    body: `Apple Zone es una tienda que exhibe un catálogo de equipos y accesorios Apple, con coordinación de pedidos y atención al cliente a través de WhatsApp. El sitio funciona como vitrina informativa: los precios, la disponibilidad de stock y las condiciones finales de cada venta se confirman directamente en la conversación con nuestro equipo antes de concretar cualquier compra.`,
  },
  {
    title: '3. Precios y disponibilidad',
    body: `Los precios mostrados en el catálogo son referenciales y pueden variar sin previo aviso debido a fluctuaciones de importación, tipo de cambio o disponibilidad de stock. El precio y las condiciones finales de compra siempre se confirman por WhatsApp antes de formalizar el pedido.`,
  },
  {
    title: '4. Proceso de compra',
    body: `Las compras se coordinan de forma manual a través de WhatsApp: el cliente elige un producto, envía su consulta o pedido, y nuestro equipo confirma precio, disponibilidad, forma de pago y método de entrega o retiro. Ninguna compra se considera confirmada hasta que ambas partes acuerden estos detalles.`,
  },
  {
    title: '5. Pagos',
    body: `Este sitio no procesa pagos en línea ni almacena datos de tarjetas o cuentas bancarias. Las formas de pago aceptadas (transferencia, efectivo u otras) se acuerdan directamente con nuestro equipo de ventas durante la coordinación del pedido.`,
  },
  {
    title: '6. Envíos y entregas',
    body: `Coordinamos envío y retiro dentro de Bolivia según lo acordado con cada cliente. Los tiempos y costos de entrega se informan de forma particular en cada conversación, ya que pueden variar según la ubicación y el producto.`,
  },
  {
    title: '7. Garantías y devoluciones',
    body: `Los equipos comercializados cuentan con las condiciones de garantía que se especifiquen al momento de la venta, informadas directamente por nuestro equipo. Cualquier reclamo, cambio o devolución debe gestionarse contactándonos por WhatsApp dentro de los plazos que se acuerden en la venta.`,
  },
  {
    title: '8. Uso aceptable del sitio',
    body: `Al usar este sitio, te comprometes a no:

• Intentar acceder sin autorización a áreas restringidas (como el panel administrativo).
• Usar el sitio para fines fraudulentos o ilícitos.
• Interferir con el funcionamiento normal del sitio o su infraestructura.`,
  },
  {
    title: '9. Propiedad intelectual',
    body: `El contenido de este sitio (textos, imágenes, marca "Apple Zone" y diseño) pertenece a Apple Zone o se usa bajo licencia, y no puede reproducirse sin autorización previa. Las marcas y productos "Apple" mencionados pertenecen a Apple Inc. Apple Zone es un revendedor independiente y no está afiliado ni respaldado oficialmente por Apple Inc.`,
  },
  {
    title: '10. Límite de responsabilidad',
    body: `Apple Zone no será responsable por daños indirectos derivados del uso del sitio web. La información del catálogo se ofrece de buena fe, pero puede contener errores ocasionales que se corrigen al confirmar el pedido por WhatsApp.`,
  },
  {
    title: '11. Cambios a estos términos',
    body: `Podemos actualizar estos Términos de Servicio en cualquier momento. La fecha de la última actualización se indica al final de esta página. El uso continuado del sitio implica la aceptación de los términos vigentes.`,
  },
  {
    title: '12. Contacto',
    body: `Para consultas sobre estos términos, contáctanos por WhatsApp a través de la sección de contacto de este sitio.`,
  },
];

export default function TermsOfService() {
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
            Términos de Servicio
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
          ¿Tienes dudas sobre estos términos? Contáctanos por WhatsApp a través de la{' '}
          <Link to="/contact" className="underline hover:text-white/50 transition-colors">
            sección de contacto
          </Link>.
        </p>
      </div>
    </div>
  );
}
