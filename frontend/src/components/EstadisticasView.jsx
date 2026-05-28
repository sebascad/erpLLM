import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Package, Truck, ShoppingCart, Trash2, AlertTriangle, Clock } from 'lucide-react';

const COLORS = ['#6c63ff', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#60a5fa'];

const fmt = (n) => `€${(n || 0).toFixed(2)}`;

export default function EstadisticasView({ data }) {
  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)' }}>
      <div style={{ textAlign: 'center' }}>
        <TrendingUp size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
        <p>Pide al asistente que muestre las estadísticas</p>
      </div>
    </div>
  );

  const { resumen, stockPorCategoria, gastosPorMes, desechosPorMotivo, productosStockBajo, productosCaducando, topProductosPorValor } = data;

  const cards = [
    { label: 'Productos', value: resumen.total_productos, icon: Package, color: '#6c63ff' },
    { label: 'Proveedores', value: resumen.total_proveedores, icon: Truck, color: '#34d399' },
    { label: 'Pedidos', value: resumen.total_pedidos, icon: ShoppingCart, color: '#fbbf24' },
    { label: 'Desechos', value: resumen.total_desechos, icon: Trash2, color: '#f87171' },
    { label: 'Valor Inventario', value: fmt(resumen.valor_inventario), icon: TrendingUp, color: '#a78bfa', big: true },
    { label: 'Total Pérdidas', value: fmt(resumen.total_perdidas), icon: TrendingDown, color: '#f87171', big: true },
  ];

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, color: 'var(--text)' }}>
        Panel de Estadísticas
      </h2>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '16px', display: 'flex', flexDirection: 'column', gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.color }}>
              <c.icon size={18} />
              <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{c.label}</span>
            </div>
            <div style={{ fontSize: c.big ? 18 : 26, fontWeight: 800, color: 'var(--text)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Stock por Categoría */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text2)' }}>STOCK POR CATEGORÍA</h3>
          {stockPorCategoria.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stockPorCategoria}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="categoria" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                <Bar dataKey="stock" fill="#6c63ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos disponibles</p>}
        </div>

        {/* Desechos por Motivo */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text2)' }}>DESECHOS POR MOTIVO</h3>
          {desechosPorMotivo.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={desechosPorMotivo} dataKey="cantidad" nameKey="motivo" cx="50%" cy="50%" outerRadius={75} label={({ motivo, percent }) => `${motivo} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {desechosPorMotivo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin desechos registrados</p>}
        </div>

        {/* Gastos por Mes */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text2)' }}>GASTOS EN PEDIDOS (6 MESES)</h3>
          {gastosPorMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={gastosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="total" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin pedidos recientes</p>}
        </div>

        {/* Top Productos por Valor */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text2)' }}>TOP 5 PRODUCTOS POR VALOR</h3>
          {topProductosPorValor.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProductosPorValor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                <YAxis dataKey="nombre" type="category" tick={{ fill: 'var(--text2)', fontSize: 10 }} width={90} />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} formatter={(v) => fmt(v)} />
                <Bar dataKey="valor" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos disponibles</p>}
        </div>
      </div>

      {/* Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {productosStockBajo.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid #fbbf2440', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} /> STOCK BAJO (&lt;10)
            </h3>
            {productosStockBajo.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < productosStockBajo.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                <span>{p.nombre}</span>
                <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>{p.stock} {p.unidad}</span>
              </div>
            ))}
          </div>
        )}
        {productosCaducando.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid #f8717140', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} /> PRÓXIMA CADUCIDAD (7 días)
            </h3>
            {productosCaducando.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < productosCaducando.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                <span>{p.nombre}</span>
                <span style={{ color: '#f87171', fontFamily: 'var(--font-mono)' }}>{new Date(p.fecha_caducidad).toLocaleDateString('es-ES')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
