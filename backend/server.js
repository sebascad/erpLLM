require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cron = require('node-cron');
const routes = require('./routes');
const toolDefs = require('./llm-tools');
const { Producto, Desecho } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);

// ========== GEMINI SETUP ==========
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `Eres el asistente de gestión de un ERP empresarial. Tu rol es ayudar a los usuarios a gestionar su inventario, proveedores, pedidos y desechos de manera eficiente.

INSTRUCCIONES CRÍTICAS:
1. Cuando el usuario pida ver datos o realizar acciones, SIEMPRE usa las herramientas disponibles para obtener datos reales del sistema.
2. NUNCA inventes datos. Siempre consulta la base de datos usando las herramientas.
3. Después de usar herramientas de datos, usa "mostrar_vista" para navegar a la sección relevante.
4. Cuando muestres listas de productos, proveedores, pedidos o desechos, usa la herramienta correspondiente Y luego "mostrar_vista".
5. Responde siempre en español.
6. Sé conciso y profesional.
7. Si el usuario quiere crear, actualizar o eliminar algo, hazlo directamente con las herramientas.
8. Para pedidos, recuerda que al crearlos el stock se actualiza automáticamente.
9. Cuando muestres estadísticas, siempre obtén los datos actualizados con "obtener_estadisticas".

FLUJO TÍPICO:
- Usuario: "muéstrame los productos" → listar_productos + mostrar_vista("productos")
- Usuario: "quiero ver estadísticas" → obtener_estadisticas + mostrar_vista("estadisticas")
- Usuario: "crea un producto llamado X" → crear_producto(...)
- Usuario: "añade un proveedor" → crear_proveedor(...)

Siempre confirma las acciones realizadas con un resumen claro.`;

// ========== TOOL EXECUTOR ==========
async function executeTool(name, args) {
  const BASE = 'http://localhost:3001/api';
  try {
    switch (name) {
      case 'listar_productos': {
        const r = await fetch(`${BASE}/productos`);
        return await r.json();
      }
      case 'crear_producto': {
        const r = await fetch(`${BASE}/productos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
        return await r.json();
      }
      case 'actualizar_producto': {
        const { id, ...data } = args;
        const r = await fetch(`${BASE}/productos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return await r.json();
      }
      case 'eliminar_producto': {
        const r = await fetch(`${BASE}/productos/${args.id}`, { method: 'DELETE' });
        return await r.json();
      }
      case 'listar_proveedores': {
        const r = await fetch(`${BASE}/proveedores`);
        return await r.json();
      }
      case 'crear_proveedor': {
        const r = await fetch(`${BASE}/proveedores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
        return await r.json();
      }
      case 'actualizar_proveedor': {
        const { id, ...data } = args;
        const r = await fetch(`${BASE}/proveedores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return await r.json();
      }
      case 'eliminar_proveedor': {
        const r = await fetch(`${BASE}/proveedores/${args.id}`, { method: 'DELETE' });
        return await r.json();
      }
      case 'listar_pedidos': {
        const r = await fetch(`${BASE}/pedidos`);
        return await r.json();
      }
      case 'crear_pedido': {
        const r = await fetch(`${BASE}/pedidos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
        return await r.json();
      }
      case 'actualizar_pedido': {
        const { id, ...data } = args;
        const r = await fetch(`${BASE}/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return await r.json();
      }
      case 'eliminar_pedido': {
        const r = await fetch(`${BASE}/pedidos/${args.id}`, { method: 'DELETE' });
        return await r.json();
      }
      case 'listar_desechos': {
        const r = await fetch(`${BASE}/desechos`);
        return await r.json();
      }
      case 'registrar_desecho': {
        const r = await fetch(`${BASE}/desechos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
        return await r.json();
      }
      case 'eliminar_desecho': {
        const r = await fetch(`${BASE}/desechos/${args.id}`, { method: 'DELETE' });
        return await r.json();
      }
      case 'obtener_estadisticas': {
        const r = await fetch(`${BASE}/estadisticas`);
        return await r.json();
      }
      case 'mostrar_vista': {
        return { success: true, vista: args.vista, action: 'navigate' };
      }
      default:
        return { error: `Tool ${name} not implemented` };
    }
  } catch (e) {
    return { error: e.message };
  }
}

// ========== CHAT ENDPOINT ==========
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    // Convert our {role, content} history to Gemini format
    // Gemini roles: "user" | "model"  (no "system" in history)
    const geminiHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const lastUserMessage = messages[messages.length - 1].content;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolDefs }],
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
    });

    const chat = model.startChat({ history: geminiHistory });

    let navigationAction = null;
    let lastDataResult = null;

    // Agentic loop
    let currentMessage = lastUserMessage;
    while (true) {
      const result = await chat.sendMessage(currentMessage);
      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate) {
        return res.json({ message: 'Sin respuesta del modelo.', navigation: navigationAction, data: lastDataResult });
      }

      const parts = candidate.content?.parts || [];
      const functionCalls = parts.filter(p => p.functionCall);
      const textParts = parts.filter(p => p.text).map(p => p.text).join('');

      // If no function calls → final answer
      if (functionCalls.length === 0) {
        return res.json({
          message: textParts || 'Listo.',
          navigation: navigationAction,
          data: lastDataResult
        });
      }

      // Execute all function calls and build functionResponse parts
      const responseParts = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        const toolResult = await executeTool(name, args || {});

        if (name === 'mostrar_vista') {
          navigationAction = args.vista;
        } else if (toolResult.data) {
          lastDataResult = { type: name, ...toolResult };
        }

        responseParts.push({
          functionResponse: {
            name,
            response: toolResult
          }
        });
      }

      // Feed results back — Gemini expects them as the next user turn
      currentMessage = responseParts;
    }
  } catch (e) {
    console.error('Chat error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== CRON: Expired products ==========
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Checking expired products...');
  try {
    const expired = await Producto.find({
      fecha_caducidad: { $lt: new Date() },
      activo: true,
      stock: { $gt: 0 }
    });
    for (const producto of expired) {
      await Desecho.create({
        producto_id: producto._id,
        producto_nombre: producto.nombre,
        cantidad: producto.stock,
        motivo: 'caducidad',
        valor_perdido: producto.stock * producto.precio,
        automatico: true,
        notas: `Eliminación automática por caducidad el ${new Date().toLocaleDateString('es-ES')}`
      });
      await Producto.findByIdAndUpdate(producto._id, { stock: 0, activo: false });
      console.log(`[CRON] Producto caducado descartado: ${producto.nombre}`);
    }
  } catch (e) {
    console.error('[CRON] Error:', e);
  }
});

// ========== MONGODB ==========
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 3001, () => {
      console.log(`🚀 Backend running on port ${process.env.PORT || 3001}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
