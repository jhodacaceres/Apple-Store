import type { CatalogProduct, OrderForm } from './types';

export function buildWhatsappUrl(phone: string, nombre: string, precio: number, sku: string, utmLabel: string): string {
  const utmSuffix = utmLabel ? ` | Origen: ${utmLabel}` : '';
  const codPart = sku ? ` (cod. ${sku})` : '';
  const text = `Hola 👋 vengo de la web. Me interesa: ${nombre} — Bs ${precio.toLocaleString('es-BO')}${codPart}. ¿Está disponible?${utmSuffix}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function getUtmLabel(searchParams: URLSearchParams): string {
  const source   = searchParams.get('utm_source');
  const campaign = searchParams.get('utm_campaign');
  if (!source && !campaign) return '';
  return [source, campaign].filter(Boolean).join(' / ');
}

const OPTION_LABELS: Record<OrderForm['option'], string> = {
  retirar: 'Lo paso a retirar',
  envio:   'Quiero que me lo envíen',
  info:    'Necesito más información',
};

const SEP = '--------------------------------';

export function buildOrderWhatsappUrl(phone: string, product: CatalogProduct, form: OrderForm, currencySymbol = 'bs'): string {
  const total      = product.precio * form.cantidad;
  const precioFmt  = `${currencySymbol}${product.precio.toFixed(0)}`;
  const totalFmt   = `${currencySymbol}${total.toFixed(0)}`;

  const lines: string[] = [
    'Hola, quisiera hacer un pedido.',
    OPTION_LABELS[form.option],
    `Nombre: ${form.nombre}`,
    `Teléfono: ${form.telefono}`,
  ];

  if (form.option === 'envio' && form.direccion) {
    lines.push(`Dirección: ${form.direccion}`);
  }

  lines.push(SEP);
  lines.push(`${form.cantidad} x ${product.nombre}  . ${precioFmt}`);
  lines.push(SEP);
  lines.push(`Total: ................... ${totalFmt}`);
  lines.push(SEP);

  if (form.comentarios.trim()) {
    lines.push(`Comentarios: ${form.comentarios.trim()}`);
  }

  const text = lines.join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
