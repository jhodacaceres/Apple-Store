import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { CaretLeft, ShoppingBag } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import { getImageUrl } from '../lib/storage';
import { trackProductView } from '../lib/analytics';
import OrderModal from '../components/OrderModal';
import type { CatalogProduct } from '../lib/types';

const CATEGORIA_LABELS: Record<string, string> = {
  fundas:     'Fundas',
  cargadores: 'Cargadores',
  cables:     'Cables',
  airpods:    'AirPods',
  accesorios: 'Accesorios',
};

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct]   = useState<CatalogProduct | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    supabase
      .from('catalog_products')
      .select('*')
      .eq('slug', slug)
      .eq('activo', true)
      .is('deleted_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else {
          setProduct(data as CatalogProduct);
          trackProductView((data as CatalogProduct).nombre);
        }
        setLoading(false);
      });
  }, [slug]);

  if (!loading && notFound) return <Navigate to="/catalog" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pb-24 md:pb-12">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-[#2C2C2E] rounded w-40" />
            <div className="rounded-3xl bg-[#1C1C1E] overflow-hidden flex flex-col md:flex-row">
              <div className="bg-[#2C2C2E] h-72 md:h-auto md:w-1/2" />
              <div className="p-8 flex-1 space-y-4">
                <div className="h-3 bg-[#2C2C2E] rounded w-1/4" />
                <div className="h-7 bg-[#2C2C2E] rounded w-3/4" />
                <div className="h-4 bg-[#2C2C2E] rounded w-full" />
                <div className="h-8 bg-[#2C2C2E] rounded w-1/3 mt-4" />
                <div className="h-12 bg-[#2C2C2E] rounded-2xl w-full mt-4" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) return null;

  const agotado  = product.stock === 0;
  const imageUrl = getImageUrl(product);

  return (
    <>
      {showModal && (
        <OrderModal product={product} onClose={() => setShowModal(false)} />
      )}

      <div className="min-h-screen bg-[#0A0A0A] pb-24 md:pb-12">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/30 mb-8 animate-fade-in">
            <Link to="/catalog" className="flex items-center gap-1 hover:text-white/60 transition-colors">
              <CaretLeft className="w-3.5 h-3.5" />
              Catálogo
            </Link>
            <span>/</span>
            <span className="text-white/50 truncate max-w-[200px] sm:max-w-none">
              {product.nombre}
            </span>
          </nav>

          {/* Card */}
          <div className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] animate-fade-in-up">
            <div className="flex flex-col md:flex-row">

              {/* Imagen */}
              <div className="bg-[#2C2C2E] md:w-5/12 flex items-center justify-center p-10 min-h-64 relative">
                {agotado && (
                  <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wide bg-red-950/40 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full">
                    Agotado
                  </span>
                )}
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.nombre}
                    className="max-h-64 object-contain drop-shadow-xl"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <ShoppingBag className="w-28 h-28 text-white/10" />
                )}
              </div>

              {/* Detalles */}
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                      {CATEGORIA_LABELS[product.categoria] ?? product.categoria}
                    </span>
                    <span className="text-[10px] text-white/20">·</span>
                    <span className="text-[10px] font-mono text-white/20">{product.sku}</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight mb-4">
                    {product.nombre}
                  </h1>

                  {product.descripcion && (
                    <p className="text-sm text-white/50 leading-relaxed mb-6">
                      {product.descripcion}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <p className={`text-xs font-semibold ${agotado ? 'text-red-400' : 'text-emerald-400'}`}>
                      {agotado
                        ? 'Sin stock'
                        : `En stock · ${product.stock} unidad${product.stock !== 1 ? 'es' : ''}`}
                    </p>
                    {!agotado && product.stock <= 3 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-500/20">
                        ¡Últimas unidades!
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-3xl md:text-4xl text-white mb-6">
                    Bs {product.precio.toLocaleString('es-BO')}
                  </p>

                  {agotado ? (
                    <button disabled className="w-full py-4 rounded-2xl text-sm font-semibold bg-white/5 text-white/25 border border-white/10 cursor-not-allowed">
                      No disponible
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-white text-zinc-950 w-full py-4 rounded-2xl flex justify-center items-center gap-2.5 font-semibold text-base hover:bg-white/90 transition-all duration-200 active:scale-[0.98]"
                    >
                      Pedir ahora
                    </button>
                  )}

                  <p className="text-xs text-white/20 text-center mt-4">
                    Sin pago por adelantado · cerramos la venta por WhatsApp
                  </p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
