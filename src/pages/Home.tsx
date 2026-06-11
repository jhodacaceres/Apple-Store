import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck, DeviceMobile, Truck,
  MagnifyingGlass, Package, ShoppingBag, WhatsappLogo,
  CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import { useCatalogProducts } from '../hooks/useCatalogProducts';
import { getImageUrl, getPhoneImageUrl } from '../lib/storage';
import { readCache, writeCache } from '../lib/cache';
import { supabase } from '../lib/supabase';
import { trackWhatsappClick } from '../lib/analytics';
import OrderModal from '../components/OrderModal';
import OrderSuccessOverlay from '../components/OrderSuccessOverlay';
import type { CatalogProduct, CatalogCategoria, Product } from '../lib/types';

// ─── Constantes ───────────────────────────────────────────
const PAGE_SIZE = 8;
const CK_ACC    = 'az_cat_acc_v1';
const CK_PHONES = 'az_cat_phones_v1';

// ─── Subcomponentes ───────────────────────────────────────
type CatalogFilter = CatalogCategoria | 'todas' | 'celulares' | 'macs';

const CATEGORIAS: { value: CatalogFilter; label: string }[] = [
  { value: 'todas',      label: 'Todas'      },
  { value: 'celulares',  label: 'Celulares'  },
  { value: 'macs',       label: 'Macs'       },
  { value: 'fundas',     label: 'Fundas'     },
  { value: 'cargadores', label: 'Cargadores' },
  { value: 'cables',     label: 'Cables'     },
  { value: 'airpods',    label: 'AirPods'    },
  { value: 'accesorios', label: 'Accesorios' },
];

function HomePagination({ page, total, onPrev, onNext }: {
  page: number; total: number; onPrev: () => void; onNext: () => void;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const start = page * PAGE_SIZE + 1;
  const end   = Math.min((page + 1) * PAGE_SIZE, total);
  const btn   = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 transition-colors text-white/50 hover:text-white hover:bg-white/10';
  return (
    <div className="flex items-center justify-between mt-8 px-1 text-xs text-white/30">
      <span>{start}–{end} de {total}</span>
      <div className="flex gap-1">
        <button onClick={onPrev} disabled={page === 0} className={btn}>
          <CaretLeft className="w-3.5 h-3.5" /> Anterior
        </button>
        <button onClick={onNext} disabled={page >= pages - 1} className={btn}>
          Siguiente <CaretRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] animate-pulse">
      <div className="bg-[#2C2C2E] h-56" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-[#2C2C2E] rounded w-1/3" />
        <div className="h-4 bg-[#2C2C2E] rounded w-3/4" />
        <div className="h-3 bg-[#2C2C2E] rounded w-1/2" />
        <div className="h-6 bg-[#2C2C2E] rounded w-1/3 mt-2" />
        <div className="h-10 bg-[#2C2C2E] rounded-2xl w-full" />
      </div>
    </div>
  );
}

// ─── Features hero ────────────────────────────────────────
const features = [
  { Icon: ShieldCheck, title: 'Garantía Asegurada', desc: 'Revisión técnica en cada equipo antes de la venta.' },
  { Icon: DeviceMobile, title: 'Productos Originales', desc: 'Accesorios, iPhones y Macs 100% originales y certificados.' },
  { Icon: Truck, title: 'Envío en Bolivia', desc: 'Delivery a La Paz, Cochabamba y Santa Cruz.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

// ─── Props ────────────────────────────────────────────────
interface HomeProps {
  contactPhone: string;
  whatsappMessage: string;
}

// ─── Componente principal ─────────────────────────────────
export default function Home({ contactPhone, whatsappMessage }: HomeProps) {
  const shouldReduceMotion = useReducedMotion();

  // ── Caché de video hero ──
  const [videoSrc, setVideoSrc] = useState('/videos/hero-bg.mp4');
  useEffect(() => {
    const VIDEO_URL  = '/videos/hero-bg.mp4';
    const CACHE_NAME = 'az-hero-video';
    const LS_KEY     = 'az_video_etag_v1';
    let objectUrl: string | null = null;
    (async () => {
      try {
        if (!('caches' in window)) return;
        const head = await fetch(VIDEO_URL, { method: 'HEAD', cache: 'no-cache' }).catch(() => null);
        const currentEtag = head?.headers.get('etag') ?? head?.headers.get('last-modified') ?? null;
        const storedEtag  = localStorage.getItem(LS_KEY);
        const cache       = await caches.open(CACHE_NAME);
        const cached      = await cache.match(VIDEO_URL);
        if (cached && currentEtag && currentEtag === storedEtag) {
          const blob = await cached.blob();
          objectUrl = URL.createObjectURL(blob);
          setVideoSrc(objectUrl);
          return;
        }
        const response = await fetch(VIDEO_URL);
        if (!response.ok) return;
        const forBlob = response.clone();
        await cache.put(VIDEO_URL, response);
        if (currentEtag) localStorage.setItem(LS_KEY, currentEtag);
        const blob = await forBlob.blob();
        objectUrl = URL.createObjectURL(blob);
        setVideoSrc(objectUrl);
      } catch { /* fallback a URL directa */ }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []);

  // ── Catálogo ──
  const { products, loading } = useCatalogProducts();
  const [query, setQuery]         = useState('');
  const [categoria, setCategoria] = useState<CatalogFilter>('todas');
  const [modalProduct, setModalProduct] = useState<CatalogProduct | null>(null);
  const [modalPhone, setModalPhone]     = useState<Product | null>(null);

  const [cachedAcc]    = useState<CatalogProduct[]>(() => readCache(CK_ACC));
  const [cachedPhones] = useState<Product[]>(() => readCache(CK_PHONES));

  const accData = (loading && products.length === 0) ? cachedAcc : products;

  useEffect(() => { if (!loading) writeCache(CK_ACC, products); }, [products, loading]);

  const [phones, setPhones]               = useState<Product[]>(cachedPhones);
  const [phonesLoading, setPhonesLoading] = useState(cachedPhones.length === 0);

  const fetchPhones = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('visible_catalogo', true)
      .eq('status', 'available')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) {
      setPhones(data as Product[]);
      writeCache(CK_PHONES, data as Product[]);
    }
    setPhonesLoading(false);
  }, []);

  useEffect(() => { fetchPhones(); }, [fetchPhones]);

  useEffect(() => {
    const ch = supabase
      .channel('catalog_products_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { fetchPhones(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchPhones]);

  const [accPage,   setAccPage]   = useState(0);
  const [phonePage, setPhonePage] = useState(0);
  const [macPage,   setMacPage]   = useState(0);

  useEffect(() => { setAccPage(0); }, [query, categoria]);
  useEffect(() => { setPhonePage(0); setMacPage(0); }, [categoria]);

  const phoneAsProduct = (p: Product): CatalogProduct => ({
    id: p.id, sku: '',
    nombre: [p.model, p.color, p.capacity].filter(Boolean).join(' '),
    categoria: 'iPhone' as CatalogCategoria,
    descripcion: null, precio: p.price, stock: 1,
    imagen_url: p.image_url ?? null, imagen_path: p.image_path ?? null,
    slug: p.id, activo: true, deleted_at: null, updated_at: p.updated_at,
  });

  const showAccessories = categoria !== 'celulares' && categoria !== 'macs';
  const showPhones      = categoria === 'todas' || categoria === 'celulares';
  const showMacs        = categoria === 'todas' || categoria === 'macs';
  const actualPhones    = phones.filter(p => (p.device_type ?? 'phone') === 'phone');
  const actualMacs      = phones.filter(p => p.device_type === 'mac');

  const filtered = useMemo(() => {
    if (!showAccessories) return [];
    const q = query.toLowerCase();
    return accData.filter((p) => {
      const matchCategoria = categoria === 'todas' || p.categoria === (categoria as CatalogCategoria);
      const matchQuery = !q || p.nombre.toLowerCase().includes(q) || (p.descripcion ?? '').toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCategoria && matchQuery;
    });
  }, [accData, query, categoria, showAccessories]);

  const paginatedAcc    = useMemo(() => filtered.slice(accPage   * PAGE_SIZE, (accPage   + 1) * PAGE_SIZE), [filtered, accPage]);
  const paginatedPhones = useMemo(() => actualPhones.slice(phonePage * PAGE_SIZE, (phonePage + 1) * PAGE_SIZE), [actualPhones, phonePage]);
  const paginatedMacs   = useMemo(() => actualMacs.slice(macPage   * PAGE_SIZE, (macPage   + 1) * PAGE_SIZE), [actualMacs, macPage]);

  // ── Contacto ──
  const whatsappNumber  = contactPhone.replace(/[^\d+]/g, '');
  const encodedMessage  = encodeURIComponent(whatsappMessage);
  const whatsappUrl     = `https://wa.me/+591${whatsappNumber.replace('+', '')}?text=${encodedMessage}`;
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    trackWhatsappClick('home');
    window.open(whatsappUrl, '_blank');
    setSending(true);
  };
  const handleDone = useCallback(() => { setSending(false); }, []);

  return (
    <>
      {modalProduct && <OrderModal product={modalProduct} onClose={() => setModalProduct(null)} />}
      {modalPhone   && <OrderModal product={phoneAsProduct(modalPhone)} onClose={() => setModalPhone(null)} />}
      {sending      && <OrderSuccessOverlay onDone={handleDone} />}

      <div className="bg-[#0A0A0A]">

        {/* ══════════════════════ INICIO ══════════════════════ */}
        <div id="inicio">

          {/* VIDEO HERO */}
          <section className="relative min-h-[100dvh] flex items-end overflow-hidden pb-20 md:pb-0">
            <video
              autoPlay muted loop playsInline preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
              src={videoSrc}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" aria-hidden="true" />

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
                  Accesorios Apple, originales.
                </motion.h1>

                <motion.p
                  variants={shouldReduceMotion ? {} : fadeUp}
                  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="mt-6 text-lg text-white/70 max-w-md leading-relaxed"
                >
                  Fundas, cargadores, cables, AirPods y más. Productos con garantía. Envío en Bolivia.
                </motion.p>

                <motion.div
                  variants={shouldReduceMotion ? {} : fadeUp}
                  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="mt-8 flex flex-col sm:flex-row gap-3"
                >
                  <button
                    onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center justify-center bg-white text-zinc-950 px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all duration-200"
                  >
                    Ver Catálogo
                  </button>
                  <button
                    onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center justify-center border border-white/40 text-white px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/10 hover:border-white/60 active:scale-[0.98] transition-all duration-200"
                  >
                    Contactar
                  </button>
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
                    transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
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

        {/* ══════════════════════ CATÁLOGO ══════════════════════ */}
        <section id="catalogo" className="bg-[#0A0A0A] pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">

            {/* Encabezado */}
            <div className="mb-8 animate-fade-in-up">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
                {categoria === 'celulares' ? 'Celulares' : categoria === 'macs' ? 'Macs' : 'Catálogo'}
              </h2>
              <p className="text-white/30 text-sm mt-1 font-normal">
                {(loading && accData.length === 0) ? 'Cargando…' : showAccessories
                  ? `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} disponible${filtered.length !== 1 ? 's' : ''}`
                  : categoria === 'celulares'
                    ? `${actualPhones.length} equipo${actualPhones.length !== 1 ? 's' : ''} disponible${actualPhones.length !== 1 ? 's' : ''}`
                    : `${actualMacs.length} Mac${actualMacs.length !== 1 ? 's' : ''} disponible${actualMacs.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Buscador */}
            <div className="mb-5 max-w-xl animate-fade-in-up animate-delay-100">
              <div className="group bg-[#1C1C1E] rounded-2xl flex items-center px-5 py-3.5 border border-white/10 focus-within:border-white/25 transition-all duration-300">
                <MagnifyingGlass className="w-5 h-5 text-white/25 mr-3 shrink-0 group-focus-within:text-white/50 transition-colors duration-200" />
                <input
                  type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, SKU…"
                  className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/25"
                />
              </div>
            </div>

            {/* Chips de categoría */}
            <div className="flex flex-wrap gap-2 mb-10 animate-fade-in-up animate-delay-100">
              {CATEGORIAS.map((cat) => (
                <button key={cat.value} onClick={() => setCategoria(cat.value)}
                  className={categoria === cat.value
                    ? 'px-4 py-1.5 rounded-full text-sm font-semibold bg-white text-zinc-950 transition-all duration-200'
                    : 'px-4 py-1.5 rounded-full text-sm font-medium border border-white/15 text-white/50 hover:border-white/30 hover:text-white/80 transition-all duration-200'}>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grid accesorios */}
            {showAccessories && (
              <>
                {(loading && accData.length === 0) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {[1,2,3,4,5,6,7,8].map((i) => <SkeletonCard key={i} />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Package className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-white/30 font-medium">
                      {query ? `No se encontraron productos para "${query}"` : 'No hay productos disponibles en esta categoría.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {paginatedAcc.map((product, index) => {
                        const agotado  = product.stock === 0;
                        const imageUrl = getImageUrl(product);
                        return (
                          <div key={product.id}
                            className="group flex flex-col bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/15 hover:bg-[#222222] transition-all duration-300 animate-fade-in-up"
                            style={{ animationDelay: `${index * 60}ms` }}>
                            <Link to={`/producto/${product.slug}`} className="block">
                              <div className="bg-[#2C2C2E] h-56 flex items-center justify-center p-6 relative">
                                {imageUrl ? (
                                  <img src={imageUrl} alt={product.nombre}
                                    className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                  <ShoppingBag className="w-20 h-20 text-white/10" />
                                )}
                                <span className={`absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${agotado ? 'bg-red-950/40 text-red-400 border-red-500/20' : 'bg-white/[0.08] text-white/40 border-white/10'}`}>
                                  {agotado ? 'Agotado' : 'Disponible'}
                                </span>
                                {!agotado && product.stock <= 3 && (
                                  <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-950/50 text-amber-400 border border-amber-500/20">
                                    ¡Solo {product.stock}!
                                  </span>
                                )}
                              </div>
                            </Link>
                            <div className="p-5 flex flex-col flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">{product.categoria}</p>
                              <Link to={`/producto/${product.slug}`} className="group/title">
                                <h3 className="font-bold text-base text-white tracking-tight leading-snug group-hover/title:text-white/80 transition-colors">
                                  {product.nombre}
                                </h3>
                              </Link>
                              {product.descripcion && (
                                <p className="text-xs text-white/30 mt-1.5 mb-3 line-clamp-2 leading-relaxed">{product.descripcion}</p>
                              )}
                              <p className="font-bold text-2xl text-white mb-4 mt-auto">
                                Bs {product.precio.toLocaleString('es-BO')}
                              </p>
                              {agotado ? (
                                <button disabled className="w-full py-3 rounded-2xl text-sm font-semibold bg-white/5 text-white/25 border border-white/10 cursor-not-allowed">
                                  No disponible
                                </button>
                              ) : (
                                <button onClick={() => setModalProduct(product)}
                                  className="bg-white text-zinc-950 w-full py-3 rounded-2xl flex justify-center items-center gap-2 font-semibold text-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98]">
                                  Pedir ahora
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <HomePagination page={accPage} total={filtered.length}
                      onPrev={() => setAccPage(p => p - 1)} onNext={() => setAccPage(p => p + 1)} />
                  </>
                )}
              </>
            )}

            {/* Sección Celulares */}
            {showPhones && (phonesLoading ? (
              <div className={showAccessories ? 'mt-16' : ''}>
                <div className="mb-8"><div className="h-8 bg-[#2C2C2E] rounded w-64 animate-pulse" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {[1,2,3,4].map((i) => <SkeletonCard key={i} />)}
                </div>
              </div>
            ) : actualPhones.length > 0 ? (
              <div className={showAccessories ? 'mt-16' : ''}>
                <div className="mb-8 animate-fade-in-up">
                  <h3 className="text-3xl font-bold tracking-tight text-white">Celulares disponibles</h3>
                  <p className="text-white/30 text-sm mt-1">
                    {actualPhones.length} equipo{actualPhones.length !== 1 ? 's' : ''} en stock
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {paginatedPhones.map((phone, index) => {
                    const imageUrl = getPhoneImageUrl(phone);
                    const nombre = [phone.model, phone.color, phone.capacity].filter(Boolean).join(' ');
                    return (
                      <div key={phone.id}
                        className="group flex flex-col bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/15 hover:bg-[#222222] transition-all duration-300 animate-fade-in-up"
                        style={{ animationDelay: `${index * 60}ms` }}>
                        <div className="bg-[#2C2C2E] h-56 flex items-center justify-center p-6">
                          {imageUrl ? (
                            <img src={imageUrl} alt={nombre}
                              className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <ShoppingBag className="w-20 h-20 text-white/10" />
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">Celular</p>
                          <h3 className="font-bold text-base text-white tracking-tight leading-snug">{nombre}</h3>
                          <p className="font-bold text-2xl text-white mb-4 mt-auto">Bs {phone.price.toLocaleString('es-BO')}</p>
                          <button onClick={() => setModalPhone(phone)}
                            className="bg-white text-zinc-950 w-full py-3 rounded-2xl flex justify-center items-center gap-2 font-semibold text-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98]">
                            Consultar por WhatsApp
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <HomePagination page={phonePage} total={actualPhones.length}
                  onPrev={() => setPhonePage(p => p - 1)} onNext={() => setPhonePage(p => p + 1)} />
              </div>
            ) : null)}

            {/* Sección Macs */}
            {showMacs && actualMacs.length > 0 && (
              <div className="mt-16">
                <div className="mb-8 animate-fade-in-up">
                  <h3 className="text-3xl font-bold tracking-tight text-white">Macs disponibles</h3>
                  <p className="text-white/30 text-sm mt-1">
                    {actualMacs.length} Mac{actualMacs.length !== 1 ? 's' : ''} en stock
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {paginatedMacs.map((mac, index) => {
                    const imageUrl = getPhoneImageUrl(mac);
                    const nombre = [mac.model, mac.color, mac.capacity].filter(Boolean).join(' ');
                    return (
                      <div key={mac.id}
                        className="group flex flex-col bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/15 hover:bg-[#222222] transition-all duration-300 animate-fade-in-up"
                        style={{ animationDelay: `${index * 60}ms` }}>
                        <div className="bg-[#2C2C2E] h-56 flex items-center justify-center p-6">
                          {imageUrl ? (
                            <img src={imageUrl} alt={nombre}
                              className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <ShoppingBag className="w-20 h-20 text-white/10" />
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">Mac</p>
                          <h3 className="font-bold text-base text-white tracking-tight leading-snug">{nombre}</h3>
                          <p className="font-bold text-2xl text-white mb-4 mt-auto">Bs {mac.price.toLocaleString('es-BO')}</p>
                          <button onClick={() => setModalPhone(mac)}
                            className="bg-white text-zinc-950 w-full py-3 rounded-2xl flex justify-center items-center gap-2 font-semibold text-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98]">
                            Consultar por WhatsApp
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <HomePagination page={macPage} total={actualMacs.length}
                  onPrev={() => setMacPage(p => p - 1)} onNext={() => setMacPage(p => p + 1)} />
              </div>
            )}

          </div>
        </section>

        {/* ══════════════════════ CONTACTO ══════════════════════ */}
        <section id="contacto" className="bg-[#1C1C1E] border-t border-white/10 pb-24 md:pb-12">
          <div className="max-w-lg mx-auto px-4 sm:px-6 py-20 w-full">

            {/* Header */}
            <div className="text-center mb-10">
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-3 animate-fade-in-up">
                Hablemos
              </h2>
              <p className="text-base text-white/40 animate-fade-in-up animate-delay-100">
                Contáctanos por WhatsApp para una atención rápida y personalizada.
              </p>
            </div>

            {/* Card */}
            <div className="bg-[#0A0A0A] rounded-3xl border border-white/[0.08] overflow-hidden animate-fade-in-up animate-delay-200">

              {/* Burbuja de chat */}
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{whatsappMessage}</p>
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

              {/* Botón */}
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
        </section>

      </div>
    </>
  );
}
