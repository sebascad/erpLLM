import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Package, Truck, ShoppingCart, Trash2, BarChart2, LayoutDashboard, Loader, Zap, AlertCircle } from 'lucide-react';
import EstadisticasView from './components/EstadisticasView';
import DataView from './components/DataView';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'proveedores', label: 'Proveedores', icon: Truck },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
  { id: 'desechos', label: 'Desechos', icon: Trash2 },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart2 },
];

const SUGGESTIONS = [
  'Muéstrame todos los productos',
  'Ver estadísticas del inventario',
  'Listar proveedores activos',
  'Ver pedidos recientes',
  'Mostrar registro de desechos',
];

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bot size={16} color="white" />
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px 12px 12px 12px', padding: '12px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
            animation: 'bounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`
          }} />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--bg3)' : 'var(--accent)',
        border: isUser ? '1px solid var(--border)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {isUser ? <User size={16} color="var(--text2)" /> : <Bot size={16} color="white" />}
      </div>
      <div style={{
        background: isUser ? 'var(--accent)' : 'var(--card)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        padding: '10px 14px', maxWidth: '75%', fontSize: 14,
        lineHeight: 1.6, color: isUser ? 'white' : 'var(--text)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [viewData, setViewData] = useState({});
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asistente ERP. Puedo ayudarte a gestionar productos, proveedores, pedidos y desechos. ¿Qué necesitas?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatHistory = useRef([]);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');
    setError(null);

    const newUserMessage = { role: 'user', content: userMsg };
    setMessages(prev => [...prev, newUserMessage]);

    chatHistory.current = [...chatHistory.current, { role: 'user', content: userMsg }];
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory.current })
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      const assistantMsg = { role: 'assistant', content: data.message };
      setMessages(prev => [...prev, assistantMsg]);
      chatHistory.current = [...chatHistory.current, { role: 'assistant', content: data.message }];

      if (data.navigation) {
        setActiveView(data.navigation);
      }

      if (data.data) {
        const { type, data: payload } = data.data;
        setViewData(prev => {
          const next = { ...prev };
          if (type === 'listar_productos') next.productos = payload;
          else if (type === 'listar_proveedores') next.proveedores = payload;
          else if (type === 'listar_pedidos') next.pedidos = payload;
          else if (type === 'listar_desechos') next.desechos = payload;
          else if (type === 'obtener_estadisticas') next.estadisticas = payload;
          return next;
        });
      }
    } catch (e) {
      setError('Error al conectar con el servidor. ¿Está el backend activo?');
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error de conexión con el servidor. Por favor verifica que el backend esté funcionando.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentData = activeView === 'estadisticas' ? viewData.estadisticas : viewData[activeView];

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>ERP AI</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>v1.0 · LLM-powered</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', padding: '4px 8px 8px', fontWeight: 600 }}>MÓDULOS</div>
          {NAV_ITEMS.map(item => {
            const active = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
                  background: active ? 'var(--accent)20' : 'transparent',
                  color: active ? 'var(--accent2)' : 'var(--text2)',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <item.icon size={16} />
                {item.label}
                {active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
            💡 Toda la interacción es a través del chat
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg2)' }}>
          {NAV_ITEMS.find(n => n.id === activeView) && React.createElement(NAV_ITEMS.find(n => n.id === activeView).icon, { size: 18, color: 'var(--accent)' })}
          <span style={{ fontSize: 16, fontWeight: 700 }}>{NAV_ITEMS.find(n => n.id === activeView)?.label || 'Dashboard'}</span>
          {loading && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 12 }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Procesando...
          </div>}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Content split */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Data panel */}
          <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid var(--border)', background: 'var(--bg)' }}>
            {activeView === 'dashboard' && (
              <div style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
                <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Bienvenido al ERP</h2>
                <p style={{ color: 'var(--text2)', marginBottom: 32, fontSize: 14 }}>
                  Usa el chat para gestionar tu negocio. Prueba con alguno de estos comandos:
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                      style={{
                        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                        padding: '14px 18px', textAlign: 'left', color: 'var(--text)', fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}>
                      <span style={{ color: 'var(--accent)', fontSize: 16 }}>›</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeView === 'estadisticas' && <EstadisticasView data={currentData} />}
            {['productos', 'proveedores', 'pedidos', 'desechos'].includes(activeView) && (
              <DataView vista={activeView} data={currentData} />
            )}
          </div>

          {/* Chat panel */}
          <div style={{ width: 380, display: 'flex', flexDirection: 'column', background: 'var(--bg2)', flexShrink: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Asistente ERP</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>claude-sonnet-4</span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {loading && <TypingIndicator />}
              {error && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#f87171', fontSize: 12, padding: '8px 12px', background: '#f8717110', borderRadius: 8, marginBottom: 12 }}>
                  <AlertCircle size={13} /> {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Escribe un comando..."
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', maxHeight: 120,
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 12px', color: 'var(--text)',
                    fontSize: 13, lineHeight: 1.5, outline: 'none',
                    fontFamily: 'var(--font-main)', overflowY: 'auto'
                  }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                  style={{
                    width: 40, height: 40, borderRadius: 10, border: 'none',
                    background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg3)',
                    color: input.trim() && !loading ? 'white' : 'var(--text3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', flexShrink: 0
                  }}>
                  {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, textAlign: 'right' }}>
                Enter para enviar · Shift+Enter nueva línea
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
