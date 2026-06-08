import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlass, Package, ShoppingBag } from "@phosphor-icons/react";
import { useCatalogProducts } from "../hooks/useCatalogProducts";
import { getImageUrl, getPhoneImageUrl } from "../lib/storage";
import { supabase } from "../lib/supabase";
import OrderModal from "../components/OrderModal";
import type { CatalogProduct, CatalogCategoria, Product } from "../lib/types";

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

export default function Catalog() {
  const { products, loading } = useCatalogProducts();
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<CatalogFilter>('todas');
  const [modalProduct, setModalProduct] = useState<CatalogProduct | null>(null);
  const [modalPhone, setModalPhone]     = useState<Product | null>(null);
  const [phones, setPhones] = useState<Product[]>([]);

  const phoneAsProduct = (p: Product): CatalogProduct => ({
    id: p.id,
    sku: '',
    nombre: [p.model, p.color, p.capacity].filter(Boolean).join(' '),
    categoria: 'iPhone' as CatalogCategoria,
    descripcion: null,
    precio: p.price,
    stock: 1,
    imagen_url: p.image_url ?? null,
    imagen_path: p.image_path ?? null,
    slug: p.id,
    activo: true,
    deleted_at: null,
    updated_at: p.updated_at,
  });

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('visible_catalogo', true)
      .eq('status', 'available')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPhones(data as Product[]); });
  }, []);

  const showAccessories = categoria !== 'celulares' && categoria !== 'macs';
  const showPhones      = categoria === 'todas' || categoria === 'celulares';
  const showMacs        = categoria === 'todas' || categoria === 'macs';
  const actualPhones    = phones.filter(p => (p.device_type ?? 'phone') === 'phone');
  const actualMacs      = phones.filter(p => p.device_type === 'mac');

  const filtered = useMemo(() => {
    if (!showAccessories) return [];
    const q = query.toLowerCase();
    return products.filter((p) => {
      const matchCategoria = categoria === 'todas' || p.categoria === (categoria as CatalogCategoria);
      const matchQuery =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchCategoria && matchQuery;
    });
  }, [products, query, categoria, showAccessories]);

  return (
    <>
      {modalProduct && (
        <OrderModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
      {modalPhone && (
        <OrderModal
          product={phoneAsProduct(modalPhone)}
          onClose={() => setModalPhone(null)}
        />
      )}

      <div className="min-h-screen bg-[#0A0A0A] pb-24 md:pb-12">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Encabezado */}
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
              {categoria === 'celulares' ? 'Celulares' : categoria === 'macs' ? 'Macs' : 'Catálogo'}
            </h1>
            <p className="text-white/30 text-sm mt-1 font-normal">
              {loading ? 'Cargando…' : showAccessories
                ? `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} disponible${filtered.length !== 1 ? 's' : ''}`
                : categoria === 'celulares'
                  ? `${actualPhones.length} equipo${actualPhones.length !== 1 ? 's' : ''} disponible${actualPhones.length !== 1 ? 's' : ''}`
                  : `${actualMacs.length} Mac${actualMacs.length !== 1 ? 's' : ''} disponible${actualMacs.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Buscador */}
          <div className="mb-5 max-w-xl animate-fade-in-up animate-delay-100">
            <div className="group bg-[#1C1C1E] rounded-2xl flex items-center px-5 py-3.5 border border-white/10 focus-within:border-white/25 transition-all duration-300">
              <MagnifyingGlass className="w-5 h-5 text-white/25 mr-3 flex-shrink-0 group-focus-within:text-white/50 transition-colors duration-200" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, SKU…"
                className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/25"
              />
            </div>
          </div>

          {/* Chips de categoría */}
          <div className="flex flex-wrap gap-2 mb-10 animate-fade-in-up animate-delay-100">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoria(cat.value)}
                className={
                  categoria === cat.value
                    ? "px-4 py-1.5 rounded-full text-sm font-semibold bg-white text-zinc-950 transition-all duration-200"
                    : "px-4 py-1.5 rounded-full text-sm font-medium border border-white/15 text-white/50 hover:border-white/30 hover:text-white/80 transition-all duration-200"
                }
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de accesorios */}
          {showAccessories && (loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Package className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/30 font-medium">
                {query
                  ? `No se encontraron productos para "${query}"`
                  : "No hay productos disponibles en esta categoría."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map((product, index) => {
                const agotado = product.stock === 0;
                const imageUrl = getImageUrl(product);

                return (
                  <div
                    key={product.id}
                    className="group flex flex-col bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/15 hover:bg-[#222222] transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    {/* Imagen */}
                    <Link to={`/producto/${product.slug}`} className="block">
                      <div className="bg-[#2C2C2E] h-56 flex items-center justify-center p-6 relative">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.nombre}
                            className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <ShoppingBag className="w-20 h-20 text-white/10" />
                        )}
                        <span
                          className={`absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                            agotado
                              ? "bg-red-950/40 text-red-400 border-red-500/20"
                              : "bg-white/[0.08] text-white/40 border-white/10"
                          }`}
                        >
                          {agotado ? "Agotado" : "Disponible"}
                        </span>
                        {!agotado && product.stock <= 3 && (
                          <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-950/50 text-amber-400 border border-amber-500/20">
                            ¡Solo {product.stock}!
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="p-5 flex flex-col flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">
                        {product.categoria}
                      </p>
                      <Link
                        to={`/producto/${product.slug}`}
                        className="group/title"
                      >
                        <h3 className="font-bold text-base text-white tracking-tight leading-snug group-hover/title:text-white/80 transition-colors">
                          {product.nombre}
                        </h3>
                      </Link>
                      {product.descripcion && (
                        <p className="text-xs text-white/30 mt-1.5 mb-3 line-clamp-2 leading-relaxed">
                          {product.descripcion}
                        </p>
                      )}
                      <p className="font-bold text-2xl text-white mb-4 mt-auto">
                        Bs {product.precio.toLocaleString("es-BO")}
                      </p>

                      {agotado ? (
                        <button
                          disabled
                          className="w-full py-3 rounded-2xl text-sm font-semibold bg-white/5 text-white/25 border border-white/10 cursor-not-allowed"
                        >
                          No disponible
                        </button>
                      ) : (
                        <button
                          onClick={() => setModalProduct(product)}
                          className="bg-white text-zinc-950 w-full py-3 rounded-2xl flex justify-center items-center gap-2 font-semibold text-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98]"
                        >
                          Pedir ahora
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {/* ── Sección Celulares ── */}
          {showPhones && actualPhones.length > 0 && (
            <div className="mt-16">
              <div className="mb-8 animate-fade-in-up">
                <h2 className="text-3xl font-bold tracking-tight text-white">Celulares disponibles</h2>
                <p className="text-white/30 text-sm mt-1">
                  {actualPhones.length} equipo{actualPhones.length !== 1 ? 's' : ''} en stock
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {actualPhones.map((phone, index) => {
                  const imageUrl = getPhoneImageUrl(phone);
                  const nombre = [phone.model, phone.color, phone.capacity].filter(Boolean).join(' ');
                  return (
                    <div key={phone.id}
                      className="group flex flex-col bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/15 hover:bg-[#222222] transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="bg-[#2C2C2E] h-56 flex items-center justify-center p-6">
                        {imageUrl ? (
                          <img src={imageUrl} alt={nombre}
                            className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <ShoppingBag className="w-20 h-20 text-white/10" />
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">Celular</p>
                        <h3 className="font-bold text-base text-white tracking-tight leading-snug">{nombre}</h3>
                        <p className="font-bold text-2xl text-white mb-4 mt-auto">Bs {phone.price.toLocaleString('es-BO')}</p>
                        <button onClick={() => setModalPhone(phone)}
                          className="bg-white text-zinc-950 w-full py-3 rounded-2xl flex justify-center items-center gap-2 font-semibold text-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98]"
                        >
                          Consultar por WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* ── Sección Macs ── */}
          {showMacs && actualMacs.length > 0 && (
            <div className="mt-16">
              <div className="mb-8 animate-fade-in-up">
                <h2 className="text-3xl font-bold tracking-tight text-white">Macs disponibles</h2>
                <p className="text-white/30 text-sm mt-1">
                  {actualMacs.length} Mac{actualMacs.length !== 1 ? 's' : ''} en stock
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {actualMacs.map((mac, index) => {
                  const imageUrl = getPhoneImageUrl(mac);
                  const nombre = [mac.model, mac.color, mac.capacity].filter(Boolean).join(' ');
                  return (
                    <div key={mac.id}
                      className="group flex flex-col bg-[#1C1C1E] rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/15 hover:bg-[#222222] transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="bg-[#2C2C2E] h-56 flex items-center justify-center p-6">
                        {imageUrl ? (
                          <img src={imageUrl} alt={nombre}
                            className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <ShoppingBag className="w-20 h-20 text-white/10" />
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">Mac</p>
                        <h3 className="font-bold text-base text-white tracking-tight leading-snug">{nombre}</h3>
                        <p className="font-bold text-2xl text-white mb-4 mt-auto">Bs {mac.price.toLocaleString('es-BO')}</p>
                        <button onClick={() => setModalPhone(mac)}
                          className="bg-white text-zinc-950 w-full py-3 rounded-2xl flex justify-center items-center gap-2 font-semibold text-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98]"
                        >
                          Consultar por WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
