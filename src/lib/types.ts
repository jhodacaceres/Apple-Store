export interface Equipo {
  id: string;
  modelo: string;
  color: string | null;
  capacidad: string | null;
  precio: number;
  imei: string | null;
  imagen_url: string | null;
  imagen_path: string | null;
  visible_catalogo: boolean;
  estado: 'disponible' | 'vendido' | 'reservado';
  tipo_dispositivo: 'telefono' | 'mac';
  creado_en: string;
  actualizado_en: string;
}

export interface EquipoEliminado extends Equipo {
  eliminado_en: string;
  eliminado_por: string | null;
}

export interface Venta {
  id: string;
  numero_venta: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  equipo_id: string | null;
  accesorio_id: string | null;
  precio_total: number;
  estado: 'pendiente' | 'completada' | 'cancelada';
  notas: string | null;
  creado_en: string;
  eliminado_en: string | null;
  creado_por?: string | null;
  creado_por_nombre?: string | null;
  equipos?: (Pick<Equipo, 'modelo' | 'color' | 'capacidad'> & { tipo_dispositivo?: 'telefono' | 'mac' }) | null;
  accesorios?: Pick<Accesorio, 'nombre' | 'precio' | 'categoria'> | null;
}

export interface Configuracion {
  id: number;
  telefono_contacto: string;
  mensaje_whatsapp: string;
  wa_phone_number_id: string | null;
  ia_activa_global: boolean;
  ia_modelo: string;
  ia_prompt_sistema: string;
  actualizado_en: string;
  actualizado_por: string | null;
  actualizado_por_correo: string | null;
}

export type AccesorioCategoria = 'fundas' | 'cargadores' | 'cables' | 'airpods' | 'accesorios';

export interface Accesorio {
  id: string;
  sku: string;
  nombre: string;
  categoria: AccesorioCategoria;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagen_url: string | null;
  imagen_path: string | null;
  slug: string;
  activo: boolean;
  actualizado_en: string;
}

export interface AccesorioEliminado extends Accesorio {
  eliminado_en: string;
  eliminado_por: string | null;
}

export interface Perfil {
  id: string;
  correo: string | null;
  nombre_completo: string | null;
  rol: 'admin' | 'empleado';
  activo: boolean;
  eliminado_en: string | null;
  creado_en: string;
  actualizado_en: string;
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

export type RemitenteMensaje = 'cliente' | 'ia' | 'humano' | 'sistema';
export type EstadoEntregaMensaje = 'enviado' | 'entregado' | 'leido' | 'fallido';

export interface Conversacion {
  id: string;
  telefono_cliente: string;
  nombre_cliente: string | null;
  ia_activa: boolean;
  requiere_humano: boolean;
  estado: 'abierta' | 'cerrada';
  ultimo_mensaje_en: string | null;
  no_leidos: number;
  creado_en: string;
  actualizado_en: string;
}

export interface Mensaje {
  id: string;
  conversacion_id: string;
  remitente: RemitenteMensaje;
  contenido: string;
  wa_message_id: string | null;
  estado_entrega: EstadoEntregaMensaje | null;
  metadata: Record<string, unknown>;
  creado_en: string;
}
