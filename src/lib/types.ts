export interface Product {
  id: string;
  model: string;
  color: string | null;
  capacity: string | null;
  price: number;
  imei: string | null;
  image_url: string | null;
  image_path: string | null;
  visible_catalogo: boolean;
  status: 'available' | 'sold' | 'reserved';
  device_type: 'phone' | 'mac';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  product_id: string | null;
  catalog_product_id: string | null;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  products?: (Pick<Product, 'model' | 'color' | 'capacity' | 'deleted_at'> & { device_type?: 'phone' | 'mac' }) | null;
  catalog_products?: Pick<CatalogProduct, 'nombre' | 'precio' | 'deleted_at' | 'categoria'> | null;
}

export interface AppSettings {
  id: number;
  contact_phone: string;
  whatsapp_message: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_email: string | null;
}

export type CatalogCategoria = 'fundas' | 'cargadores' | 'cables' | 'airpods' | 'accesorios';

export interface CatalogProduct {
  id: string;
  sku: string;
  nombre: string;
  categoria: CatalogCategoria;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagen_url: string | null;
  imagen_path: string | null;
  slug: string;
  activo: boolean;
  deleted_at: string | null;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'employee';
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_visits: number;
  unique_visitors: number;
  avg_duration_seconds: number;
  bounce_rate: number;       // %
  whatsapp_clicks: number;
  conversion_rate: number;   // %
}

export interface VisitsByDay {
  day: string;   // YYYY-MM-DD
  visits: number;
}

export interface TopProduct {
  product: string;
  views: number;
}

export interface StorageStats {
  storage_bytes: number;
  storage_objects: number;
  db_bytes: number;
}

export type OrderOption = 'retirar' | 'envio' | 'info';

export interface OrderForm {
  option: OrderOption;
  nombre: string;
  telefono: string;
  direccion: string;
  comentarios: string;
  cantidad: number;
}
