const express = require('express');
const router = express.Router();
const { Producto, Proveedor, Pedido, Desecho } = require('./models');

// ========== PRODUCTOS ==========
router.get('/productos', async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true }).populate('proveedor_id', 'nombre');
    res.json({ success: true, data: productos });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/productos', async (req, res) => {
  try {
    const p = await Producto.create(req.body);
    res.json({ success: true, data: p, message: `Producto "${p.nombre}" creado con éxito` });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/productos/:id', async (req, res) => {
  try {
    const p = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, data: p, message: `Producto "${p.nombre}" actualizado` });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/productos/:id', async (req, res) => {
  try {
    const p = await Producto.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!p) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, message: `Producto "${p.nombre}" eliminado` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ========== PROVEEDORES ==========
router.get('/proveedores', async (req, res) => {
  try {
    const proveedores = await Proveedor.find({ activo: true });
    res.json({ success: true, data: proveedores });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/proveedores', async (req, res) => {
  try {
    const p = await Proveedor.create(req.body);
    res.json({ success: true, data: p, message: `Proveedor "${p.nombre}" creado con éxito` });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/proveedores/:id', async (req, res) => {
  try {
    const p = await Proveedor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    res.json({ success: true, data: p, message: `Proveedor "${p.nombre}" actualizado` });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/proveedores/:id', async (req, res) => {
  try {
    const p = await Proveedor.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!p) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    res.json({ success: true, message: `Proveedor "${p.nombre}" eliminado` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ========== PEDIDOS ==========
router.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ createdAt: -1 }).populate('proveedor_id', 'nombre');
    res.json({ success: true, data: pedidos });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/pedidos', async (req, res) => {
  try {
    const proveedor = await Proveedor.findById(req.body.proveedor_id);
    if (!proveedor) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });

    // Calculate total and update stock
    let total = 0;
    const itemsConNombre = [];
    for (const item of req.body.items || []) {
      const producto = await Producto.findById(item.producto_id);
      if (producto) {
        const subtotal = item.cantidad * item.precio_unitario;
        total += subtotal;
        await Producto.findByIdAndUpdate(item.producto_id, { $inc: { stock: item.cantidad } });
        itemsConNombre.push({ ...item, producto_nombre: producto.nombre });
      }
    }

    const pedido = await Pedido.create({
      ...req.body,
      proveedor_nombre: proveedor.nombre,
      items: itemsConNombre,
      total,
      estado: 'recibido'
    });

    res.json({ success: true, data: pedido, message: `Pedido creado a "${proveedor.nombre}" por €${total.toFixed(2)}. Stock actualizado automáticamente.` });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.put('/pedidos/:id', async (req, res) => {
  try {
    const p = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    res.json({ success: true, data: p, message: 'Pedido actualizado' });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/pedidos/:id', async (req, res) => {
  try {
    const p = await Pedido.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    res.json({ success: true, message: 'Pedido eliminado' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ========== DESECHOS ==========
router.get('/desechos', async (req, res) => {
  try {
    const desechos = await Desecho.find().sort({ createdAt: -1 });
    res.json({ success: true, data: desechos });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/desechos', async (req, res) => {
  try {
    const producto = await Producto.findById(req.body.producto_id);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    const cantidad = req.body.cantidad;
    if (cantidad > producto.stock) {
      return res.status(400).json({ success: false, error: `Stock insuficiente. Stock actual: ${producto.stock}` });
    }

    const valor_perdido = cantidad * producto.precio;
    await Producto.findByIdAndUpdate(req.body.producto_id, { $inc: { stock: -cantidad } });

    const desecho = await Desecho.create({
      ...req.body,
      producto_nombre: producto.nombre,
      valor_perdido
    });

    res.json({ success: true, data: desecho, message: `Desecho registrado: ${cantidad} ${producto.unidad} de "${producto.nombre}". Pérdida: €${valor_perdido.toFixed(2)}` });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/desechos/:id', async (req, res) => {
  try {
    const d = await Desecho.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: 'Desecho no encontrado' });
    res.json({ success: true, message: 'Registro de desecho eliminado' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ========== ESTADÍSTICAS ==========
router.get('/estadisticas', async (req, res) => {
  try {
    const [productos, pedidos, desechos, proveedores] = await Promise.all([
      Producto.find({ activo: true }),
      Pedido.find(),
      Desecho.find(),
      Proveedor.find({ activo: true })
    ]);

    // Stock por categoría
    const stockPorCategoria = {};
    productos.forEach(p => {
      if (!stockPorCategoria[p.categoria]) stockPorCategoria[p.categoria] = { stock: 0, valor: 0 };
      stockPorCategoria[p.categoria].stock += p.stock;
      stockPorCategoria[p.categoria].valor += p.stock * p.precio;
    });

    // Gastos por mes (últimos 6 meses)
    const gastosPorMes = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    pedidos.filter(p => p.createdAt >= sixMonthsAgo).forEach(p => {
      const mes = p.createdAt.toISOString().slice(0, 7);
      gastosPorMes[mes] = (gastosPorMes[mes] || 0) + p.total;
    });

    // Desechos por motivo
    const desechosPorMotivo = {};
    desechos.forEach(d => {
      if (!desechosPorMotivo[d.motivo]) desechosPorMotivo[d.motivo] = { cantidad: 0, valor: 0 };
      desechosPorMotivo[d.motivo].cantidad += d.cantidad;
      desechosPorMotivo[d.motivo].valor += d.valor_perdido;
    });

    // Productos con bajo stock (menos de 10)
    const productosStockBajo = productos.filter(p => p.stock < 10).map(p => ({
      nombre: p.nombre, stock: p.stock, unidad: p.unidad
    }));

    // Productos próximos a caducar (7 días)
    const proxCaducidad = new Date();
    proxCaducidad.setDate(proxCaducidad.getDate() + 7);
    const productosCaducando = productos.filter(p =>
      p.fecha_caducidad && p.fecha_caducidad <= proxCaducidad && p.fecha_caducidad > new Date()
    ).map(p => ({ nombre: p.nombre, fecha_caducidad: p.fecha_caducidad, stock: p.stock }));

    res.json({
      success: true,
      data: {
        resumen: {
          total_productos: productos.length,
          total_proveedores: proveedores.length,
          total_pedidos: pedidos.length,
          total_desechos: desechos.length,
          valor_inventario: productos.reduce((acc, p) => acc + p.stock * p.precio, 0),
          total_perdidas: desechos.reduce((acc, d) => acc + d.valor_perdido, 0),
          gasto_total_pedidos: pedidos.reduce((acc, p) => acc + p.total, 0)
        },
        stockPorCategoria: Object.entries(stockPorCategoria).map(([cat, v]) => ({ categoria: cat, ...v })),
        gastosPorMes: Object.entries(gastosPorMes).sort().map(([mes, total]) => ({ mes, total })),
        desechosPorMotivo: Object.entries(desechosPorMotivo).map(([motivo, v]) => ({ motivo, ...v })),
        productosStockBajo,
        productosCaducando,
        topProductosPorValor: productos.sort((a, b) => (b.stock * b.precio) - (a.stock * a.precio)).slice(0, 5)
          .map(p => ({ nombre: p.nombre, valor: p.stock * p.precio, stock: p.stock }))
      }
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
