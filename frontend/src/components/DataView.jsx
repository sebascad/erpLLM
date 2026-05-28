import React from 'react';
import { Package, Truck, ShoppingCart, Trash2, AlertCircle } from 'lucide-react';

const fmt = (n) => `€${(n || 0).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';

function Badge({ children, color = 'var(--accent)' }) {
  return (
    <span style={{
      background: color + '20', color, border: `1px solid ${color}40`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap'
    }}>{children}</span>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '10px 14px', fontWeight: 600,
                fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em',
                borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
              }}>{h.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Sin datos</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '10px 14px', verticalAlign: 'middle' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isExpiringSoon(date) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff <= 7 && diff > 0;
}

export default function DataView({ vista, data }) {
  if (!data) {
    const icons = { productos: Package, proveedores: Truck, pedidos: ShoppingCart, desechos: Trash2 };
    const Icon = icons[vista] || Package;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)' }}>
        <div style={{ textAlign: 'center' }}>
          <Icon size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Pide al asistente que muestre los {vista}</p>
        </div>
      </div>
    );
  }

  if (vista === 'productos') {
    return (
      <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Productos <span style={{ color: 'var(--text3)', fontSize: 14, fontWeight: 500 }}>({data.length})</span></h2>
        <Table
          headers={['Nombre', 'Categoría', 'Precio', 'Stock', 'Unidad', 'Caducidad']}
          rows={data.map(p => [
            <span style={{ fontWeight: 600 }}>{p.nombre}</span>,
            <Badge color="var(--accent2)">{p.categoria}</Badge>,
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent3)' }}>{fmt(p.precio)}</span>,
            <span style={{ fontFamily: 'var(--font-mono)', color: p.stock < 10 ? '#fbbf24' : 'var(--text)' }}>{p.stock}</span>,
            <span style={{ color: 'var(--text2)' }}>{p.unidad}</span>,
            p.fecha_caducidad
              ? <span style={{ color: isExpiringSoon(p.fecha_caducidad) ? '#f87171' : 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isExpiringSoon(p.fecha_caducidad) && <AlertCircle size={12} />}
                {fmtDate(p.fecha_caducidad)}
              </span>
              : <span style={{ color: 'var(--text3)' }}>Sin caducidad</span>
          ])}
        />
      </div>
    );
  }

  if (vista === 'proveedores') {
    return (
      <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Proveedores <span style={{ color: 'var(--text3)', fontSize: 14, fontWeight: 500 }}>({data.length})</span></h2>
        <Table
          headers={['Nombre', 'Contacto', 'Teléfono', 'Dirección']}
          rows={data.map(p => [
            <span style={{ fontWeight: 600 }}>{p.nombre}</span>,
            <span style={{ color: 'var(--text2)' }}>{p.contacto || '—'}</span>,
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.telefono || '—'}</span>,
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{p.direccion || '—'}</span>
          ])}
        />
      </div>
    );
  }

  if (vista === 'pedidos') {
    return (
      <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Pedidos a Proveedor <span style={{ color: 'var(--text3)', fontSize: 14, fontWeight: 500 }}>({data.length})</span></h2>
        <Table
          headers={['Proveedor', 'Estado', 'Items', 'Total', 'Fecha']}
          rows={data.map(p => [
            <span style={{ fontWeight: 600 }}>{p.proveedor_nombre || p.proveedor_id?.nombre || '—'}</span>,
            <Badge color={p.estado === 'recibido' ? '#34d399' : p.estado === 'cancelado' ? '#f87171' : '#fbbf24'}>{p.estado}</Badge>,
            <span style={{ color: 'var(--text2)' }}>{(p.items || []).length} producto(s)</span>,
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent3)' }}>{fmt(p.total)}</span>,
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{fmtDate(p.createdAt)}</span>
          ])}
        />
      </div>
    );
  }

  if (vista === 'desechos') {
    return (
      <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Registro de Desechos <span style={{ color: 'var(--text3)', fontSize: 14, fontWeight: 500 }}>({data.length})</span></h2>
        <Table
          headers={['Producto', 'Cantidad', 'Motivo', 'Valor Perdido', 'Automático', 'Fecha']}
          rows={data.map(d => [
            <span style={{ fontWeight: 600 }}>{d.producto_nombre}</span>,
            <span style={{ fontFamily: 'var(--font-mono)' }}>{d.cantidad}</span>,
            <Badge color={d.motivo === 'caducidad' ? '#f87171' : d.motivo === 'daño' ? '#fbbf24' : 'var(--text3)'}>{d.motivo}</Badge>,
            <span style={{ fontFamily: 'var(--font-mono)', color: '#f87171' }}>{fmt(d.valor_perdido)}</span>,
            <Badge color={d.automatico ? '#a78bfa' : 'var(--text3)'}>{d.automatico ? 'Auto' : 'Manual'}</Badge>,
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>{fmtDate(d.createdAt)}</span>
          ])}
        />
      </div>
    );
  }

  return null;
}
