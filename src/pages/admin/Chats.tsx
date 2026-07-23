import { useState, useEffect } from 'react';
import { ChatCircle, Warning, PaperPlaneRight, Robot, CaretLeft } from '@phosphor-icons/react';
import { useAdminTheme } from '../../contexts/AdminThemeContext';
import { useConversaciones } from '../../hooks/useConversaciones';
import { useMensajes } from '../../hooks/useMensajes';

function getInitials(name: string | null, phone: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

export default function Chats() {
  const { isAdminDarkMode: dark } = useAdminTheme();
  const { conversaciones, loading, toggleIA, marcarLeida } = useConversaciones();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { mensajes, sending, enviarComoHumano } = useMensajes(selectedId);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');

  const selected = conversaciones.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId) marcarLeida(selectedId);
  }, [selectedId, marcarLeida]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    setSendError('');
    const result = await enviarComoHumano(text);
    if (result.error) setSendError(result.error);
  };

  const cardClass = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex-shrink-0">
        <h2 className={`text-2xl md:text-3xl font-black ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Chats de WhatsApp</h2>
        <p className="text-gray-400 mt-1 text-sm">Conversaciones del chatbot y control de la IA.</p>
      </div>

      <div className={`flex-1 min-h-0 rounded-2xl border shadow-sm overflow-hidden flex ${cardClass}`}>
        {/* Lista de conversaciones */}
        <div className={`w-full sm:w-80 flex-shrink-0 border-r overflow-y-auto ${dark ? 'border-gray-700' : 'border-gray-100'} ${selectedId ? 'hidden sm:block' : ''}`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-16 rounded-xl animate-pulse ${dark ? 'bg-gray-700' : 'bg-gray-100'}`} />
              ))}
            </div>
          ) : conversaciones.length === 0 ? (
            <div className="p-8 text-center">
              <ChatCircle className={`w-10 h-10 mx-auto mb-2 ${dark ? 'text-gray-600' : 'text-gray-200'}`} />
              <p className="text-gray-400 text-sm">Aún no hay conversaciones.</p>
            </div>
          ) : (
            conversaciones.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-center gap-3 p-4 border-b text-left transition-colors ${dark ? 'border-gray-700' : 'border-gray-50'} ${
                  selectedId === c.id ? (dark ? 'bg-gray-700' : 'bg-gray-50') : dark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${
                    c.requiere_humano ? 'bg-red-500 text-white' : dark ? 'bg-gray-600 text-white' : 'bg-[#0A0A0A] text-white'
                  }`}
                >
                  {getInitials(c.nombre_cliente, c.telefono_cliente)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold text-sm truncate ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                      {c.nombre_cliente ?? c.telefono_cliente}
                    </p>
                    {c.no_leidos > 0 && (
                      <span className="text-[10px] font-black bg-emerald-500 text-white rounded-full px-1.5 py-0.5 flex-shrink-0">
                        {c.no_leidos}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {c.requiere_humano && <Warning className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    <p className="text-xs text-gray-400 truncate">
                      {c.requiere_humano ? 'Requiere intervención' : c.ia_activa ? 'IA activa' : 'IA desactivada'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Hilo */}
        <div className={`flex-1 flex-col min-w-0 ${!selectedId ? 'hidden sm:flex' : 'flex'}`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <ChatCircle className={`w-12 h-12 ${dark ? 'text-gray-600' : 'text-gray-200'}`} />
              <p className="text-gray-400 text-sm">Selecciona una conversación</p>
            </div>
          ) : (
            <>
              {/* Header del hilo */}
              <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <button className={`sm:hidden ${dark ? 'text-gray-400' : 'text-gray-400'}`} onClick={() => setSelectedId(null)} aria-label="Volver">
                    <CaretLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                      {selected.nombre_cliente ?? selected.telefono_cliente}
                    </p>
                    <p className="text-xs text-gray-400">{selected.telefono_cliente}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {selected.requiere_humano && (
                    <span className="hidden sm:flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                      <Warning className="w-3 h-3" /> Alerta
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Robot className={`w-4 h-4 ${selected.ia_activa ? 'text-emerald-500' : 'text-gray-400'}`} />
                    <button
                      onClick={() => toggleIA(selected.id, !selected.ia_activa)}
                      title={selected.ia_activa ? 'Desactivar IA' : 'Activar IA'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        selected.ia_activa ? 'bg-emerald-500' : dark ? 'bg-gray-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          selected.ia_activa ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {mensajes.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-8">Sin mensajes todavía.</p>
                ) : (
                  mensajes.map((m) => {
                    if (m.remitente === 'sistema') {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 text-center">
                            {m.contenido}
                          </span>
                        </div>
                      );
                    }
                    const isOutgoing = m.remitente === 'ia' || m.remitente === 'humano';
                    return (
                      <div key={m.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            m.remitente === 'ia'
                              ? 'bg-[#0A0A0A] text-white rounded-tr-none'
                              : m.remitente === 'humano'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : dark
                                  ? 'bg-gray-700 text-white rounded-tl-none'
                                  : 'bg-gray-100 text-gray-900 rounded-tl-none'
                          }`}
                        >
                          {m.remitente === 'ia' && (
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">IA</p>
                          )}
                          {m.remitente === 'humano' && (
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Tú</p>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed">{m.contenido}</p>
                          <p className="text-[10px] opacity-50 mt-1 text-right">
                            {new Date(m.creado_en).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div className={`p-4 border-t flex-shrink-0 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                {sendError && <p className="text-xs text-red-500 mb-2">{sendError}</p>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={1}
                    placeholder="Responder como humano…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    className={`flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none border transition-all ${
                      dark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-white/50'
                        : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0A0A0A]'
                    }`}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="p-3 rounded-xl bg-[#0A0A0A] text-white disabled:opacity-40 hover:bg-gray-800 transition-all active:scale-[0.98] flex-shrink-0"
                  >
                    {sending
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                      : <PaperPlaneRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
