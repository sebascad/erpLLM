db = db.getSiblingDB('erp_db');

db.createCollection('productos');
db.createCollection('proveedores');
db.createCollection('pedidos');
db.createCollection('desechos');

// Indexes
db.productos.createIndex({ nombre: 1 });
db.productos.createIndex({ fecha_caducidad: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { fecha_caducidad: { $exists: true, $ne: null } } });
db.proveedores.createIndex({ nombre: 1 });
db.pedidos.createIndex({ fecha: -1 });
db.desechos.createIndex({ fecha: -1 });

// Sample data
db.proveedores.insertMany([
  { nombre: "Distribuciones García S.L.", contacto: "garcia@distribuciones.com", telefono: "955123456", direccion: "Calle Mayor 10, Sevilla", activo: true, createdAt: new Date() },
  { nombre: "Frutas del Sur", contacto: "info@frutasdelsur.es", telefono: "952654321", direccion: "Polígono Industrial Norte, Málaga", activo: true, createdAt: new Date() }
]);

db.productos.insertMany([
  { nombre: "Tomates Cherry", categoria: "Verduras", precio: 2.50, stock: 100, unidad: "kg", proveedor_id: null, fecha_caducidad: null, createdAt: new Date() },
  { nombre: "Aceite de Oliva Virgen Extra", categoria: "Aceites", precio: 8.90, stock: 50, unidad: "litros", proveedor_id: null, fecha_caducidad: null, createdAt: new Date() },
  { nombre: "Pan de Molde", categoria: "Panadería", precio: 1.20, stock: 30, unidad: "unidades", proveedor_id: null, fecha_caducidad: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date() }
]);

print('ERP database initialized successfully');
