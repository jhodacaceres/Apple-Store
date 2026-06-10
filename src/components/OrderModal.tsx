import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Plus } from '@phosphor-icons/react';
import { buildOrderWhatsappUrl } from '../lib/whatsapp';
import { trackWhatsappClick } from '../lib/analytics';
import { getImageUrl } from '../lib/storage';
import { useSettings } from '../hooks/useSettings';
import WhatsAppIcon from './WhatsAppIcon';
import OrderSuccessOverlay from './OrderSuccessOverlay';
import type { CatalogProduct, OrderForm, OrderOption } from '../lib/types';

interface Props {
  product: CatalogProduct;
  onClose: () => void;
  currencySymbol?: string;
}

const OPTIONS: { value: OrderOption; label: string }[] = [
  { value: 'retirar', label: 'Lo paso a retirar' },
  { value: 'envio',   label: 'Quiero que me lo envíen' },
  { value: 'info',    label: 'Requiero más información' },
];

const FIELD_CLS =
  'w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all';

export default function OrderModal({ product, onClose, currencySymbol = 'bs' }: Props) {
  const { settings } = useSettings();
  const [form, setForm] = useState<OrderForm>({
    option:      'retirar',
    nombre:      '',
    telefono:    '',
    direccion:   '',
    comentarios: '',
    cantidad:    1,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquear scroll del fondo
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();
    return () => { document.body.style.overflow = ''; };
  }, []);

  const set = <K extends keyof OrderForm>(key: K, value: OrderForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const total      = product.precio * form.cantidad;
  const agotado    = product.stock === 0;
  const imageUrl   = getImageUrl(product);
  const currencyDisplay = currencySymbol === 'bs' ? 'Bs' : currencySymbol;

  const canSubmit =
    !agotado &&
    form.nombre.trim() &&
    form.telefono.trim() &&
    (form.option !== 'envio' || form.direccion.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    const phone = settings?.contact_phone ?? '59168531959';
    const url = buildOrderWhatsappUrl(phone, product, form, currencySymbol);
    trackWhatsappClick('order_modal', product.nombre);
    window.open(url, '_blank');
    setShowSuccess(true);
  };

  const handleDone = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      {showSuccess && <OrderSuccessOverlay onDone={handleDone} />}
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === backdropRef.current && !showSuccess) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-[#141414] sm:rounded-3xl overflow-hidden border border-white/[0.06] shadow-2xl flex flex-col max-h-[95dvh] animate-fade-in-up">

        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={product.nombre}
                className="w-12 h-12 object-contain rounded-xl bg-[#2C2C2E] p-1 flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                {product.categoria}
              </p>
              <h2 className="font-bold text-white text-sm leading-snug line-clamp-2">
                {product.nombre}
              </h2>
              <p className="text-white/40 text-xs mt-0.5">
                {currencyDisplay} {product.precio.toLocaleString('es-BO')} c/u
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors flex-shrink-0 ml-2"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Tipo de pedido */}
          <div>
            <p className="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wide">
              ¿Cómo lo quieres?
            </p>
            <div className="flex flex-col gap-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('option', opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all duration-200 ${
                    form.option === opt.value
                      ? 'bg-white text-zinc-950 border-white'
                      : 'bg-transparent text-white/60 border-white/10 hover:border-white/25 hover:text-white/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <p className="text-xs font-semibold text-white/40 mb-2 uppercase tracking-wide">
              Cantidad
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => set('cantidad', Math.max(1, form.cantidad - 1))}
                className="w-9 h-9 rounded-full border border-white/15 text-white/60 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-bold text-lg w-8 text-center">{form.cantidad}</span>
              <button
                onClick={() => set('cantidad', Math.min(product.stock || 99, form.cantidad + 1))}
                className="w-9 h-9 rounded-full border border-white/15 text-white/60 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-white/30 text-xs ml-1">
                {product.stock > 0 ? `(${product.stock} en stock)` : ''}
              </span>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              Tus datos
            </p>
            <input
              ref={firstInputRef}
              type="text"
              placeholder="Nombre *"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              className={FIELD_CLS}
            />
            <input
              type="tel"
              placeholder="Teléfono *"
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              className={FIELD_CLS}
            />
            {form.option === 'envio' && (
              <input
                type="text"
                placeholder="Dirección de envío *"
                value={form.direccion}
                onChange={(e) => set('direccion', e.target.value)}
                className={FIELD_CLS}
              />
            )}
            <textarea
              placeholder="Comentarios (opcional)"
              value={form.comentarios}
              onChange={(e) => set('comentarios', e.target.value)}
              rows={2}
              className={`${FIELD_CLS} resize-none`}
            />
          </div>

          {/* Resumen */}
          <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/[0.06]">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">
                {form.cantidad} × {product.nombre}
              </span>
              <span className="text-white/60">
                {currencyDisplay} {(product.precio * form.cantidad).toLocaleString('es-BO')}
              </span>
            </div>
            <div className="border-t border-white/[0.06] mt-3 pt-3 flex justify-between">
              <span className="font-semibold text-white text-sm">Total</span>
              <span className="font-bold text-white">
                {currencyDisplay} {total.toLocaleString('es-BO')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          {agotado ? (
            <button disabled className="w-full py-4 rounded-2xl text-sm font-semibold bg-white/5 text-white/25 border border-white/10 cursor-not-allowed">
              Producto agotado
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl flex justify-center items-center gap-2.5 font-semibold text-sm transition-all duration-200 ${
                canSubmit
                  ? 'bg-white text-zinc-950 hover:bg-white/90 active:scale-[0.98]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <WhatsAppIcon className="w-5 h-5" />
              Enviar pedido por WhatsApp
            </button>
          )}
          <p className="text-[11px] text-white/20 text-center mt-3">
            Sin pago por adelantado · coordinas todo por WhatsApp
          </p>
        </div>

      </div>
    </div>
    </>
  );
}
