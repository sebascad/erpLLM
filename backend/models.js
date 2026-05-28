const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  categoria: { type: String, default: 'General' },
  precio: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  unidad: { type: String, default: 'unidades' },
  proveedor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', default: null },
  fecha_caducidad: { type: Date, default: null },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const ProveedorSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  contacto: { type: String, default: '' },
  telefono: { type: String, default: '' },
  direccion: { type: String, default: '' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const PedidoSchema = new mongoose.Schema({
  proveedor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', required: true },
  proveedor_nombre: { type: String },
  estado: { type: String, enum: ['pendiente', 'recibido', 'cancelado'], default: 'recibido' },
  items: [{
    producto_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    producto_nombre: String,
    cantidad: Number,
    precio_unitario: Number
  }],
  total: { type: Number, default: 0 },
  notas: { type: String, default: '' }
}, { timestamps: true });

const DesechoSchema = new mongoose.Schema({
  producto_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
  producto_nombre: { type: String, required: true },
  cantidad: { type: Number, required: true },
  motivo: { type: String, enum: ['caducidad', 'daño', 'deterioro', 'otro'], default: 'otro' },
  valor_perdido: { type: Number, default: 0 },
  automatico: { type: Boolean, default: false },
  notas: { type: String, default: '' }
}, { timestamps: true });

module.exports = {
  Producto: mongoose.model('Producto', ProductoSchema),
  Proveedor: mongoose.model('Proveedor', ProveedorSchema),
  Pedido: mongoose.model('Pedido', PedidoSchema),
  Desecho: mongoose.model('Desecho', DesechoSchema)
};
