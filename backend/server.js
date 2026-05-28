require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const cron = require('node-cron');
const routes = require('./routes');
const toolDefs = require('./llm-tools');
const { Producto, Desecho } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

// ========== CEREBRAS SETUP ==========
// Se usan 3 modelos LLM con roles diferenciados:
//
//  MODEL_INTENT   → Modelo ligero. Clasifica la intención del usuario y decide
//                   qué herramientas hay que llamar (rápido, bajo coste).
//
//  MODEL_EXECUTOR → Modelo principal. Orquesta el agentic loop: llama a las
//                   herramientas del backend y ejecuta el CRUD real.
//
//  MODEL_NARRATOR → Modelo de síntesis. Recibe los resultados de las herramientas
//                   y genera la respuesta final en lenguaje natural para el usuario.

const client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });

const MODEL_INTENT   = 'zai-glm-4.7';    // Clasificador de intención (rápido)
const MODEL_EXECUTOR = 'zai-glm-4.7';      // Orquestador agentic + tool use
const MODEL_NARRATOR = 'gpt-oss-120b';     // Generador de respuesta final

// ========== PROMPTS ==========
const INTENT_PROMPT = `Eres un clasificador de intenciones para un ERP empresarial.
Analiza el mensaje del usuario y responde ÚNICAMENTE con un JSON con este formato:
{
  "intent": "consulta" | "creacion" | "actualizacion" | "eliminacion" | "estadisticas" | "navegacion",
  "entidad": "productos" | "proveedores" | "pedidos" | "desechos" | "estadisticas" | "ninguna",
  "resumen": "descripción breve de lo que quiere el usuario en una frase"
}
No añadas ningún texto fuera del JSON.`;

const EXECUTOR_PROMPT = `Eres el motor de ejecución de un ERP empresarial. Tu único rol es ejecutar acciones sobre la base de datos usando las herramientas disponibles.

REGLAS:
1. SIEMPRE usa las herramientas para obtener o modificar datos. NUNCA inventes datos.
2. Para mostrar listas, usa la herramienta de listado Y luego "mostrar_vista".
3. Para estadísticas, usa "obtener_estadisticas" Y luego mostrar_vista("estadisticas").
4. Ejecuta todas las acciones necesarias sin pedir confirmación.
5. Responde en español, de forma breve y técnica. El narrador se encargará de explicar el resultado al usuario.`;

const NARRATOR_PROMPT = `Eres el asistente de comunicación de un ERP empresarial. Tu rol es explicar al usuario, en español y de forma clara y amigable, el resultado de las acciones que se han ejecutado.

REGLAS:
1. Explica qué se hizo y cuál fue el resultado.
2. Si hubo errores, explícalos de forma comprensible.
3. Sé conciso: 1-3 frases como máximo.
4. No menciones términos técnicos internos (modelos, herramientas, API...).
5. Usa un tono profesional pero cercano.`;

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

// ========== LLM 1: CLASIFICADOR DE INTENCIÓN ==========
async function classifyIntent(userMessage) {
  try {
    const response = await client.chat.completions.create({
      model: MODEL_INTENT,
      max_completion_tokens: 200,
      temperature: 0,
      messages: [
        { role: 'system', content: INTENT_PROMPT },
        { role: 'user', content: userMessage }
      ]
    });
    const raw = response.choices[0].message.content.trim();
    // Limpiar posibles backticks de markdown
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    // Si falla el clasificador, devolvemos intención genérica y seguimos
    console.warn('[INTENT] Classification failed, using fallback:', e.message);
    return { intent: 'consulta', entidad: 'ninguna', resumen: userMessage };
  }
}

// ========== LLM 2: EJECUTOR AGENTIC (tool use loop) ==========
async function executeAgenticLoop(messages) {
  const conversationMessages = [
    { role: 'system', content: EXECUTOR_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  let navigationAction = null;
  let toolResults = [];
  let executorSummary = '';

  while (true) {
    const response = await client.chat.completions.create({
      model: MODEL_EXECUTOR,
      max_completion_tokens: 4096,
      tools: toolDefs,
      tool_choice: 'auto',
      messages: conversationMessages,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    conversationMessages.push(assistantMessage);

    // Sin tool calls → el ejecutor terminó
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      executorSummary = assistantMessage.content || '';
      break;
    }

    // Ejecutar tool calls en paralelo
    const callPromises = assistantMessage.tool_calls.map(async (toolCall) => {
      const name = toolCall.function.name;
      let args = {};
      try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (_) {}
      const result = await executeTool(name, args);
      return { toolCall, name, args, result };
    });

    const calls = await Promise.all(callPromises);

    for (const { toolCall, name, args, result } of calls) {
      if (name === 'mostrar_vista') {
        navigationAction = args.vista;
      } else {
        toolResults.push({ tool: name, args, result });
      }

      conversationMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    if (choice.finish_reason === 'stop') {
      executorSummary = assistantMessage.content || '';
      break;
    }
  }

  // Extraer datos para el frontend (último resultado con .data)
  let lastDataResult = null;
  for (const tr of toolResults) {
    if (tr.result && tr.result.data) {
      lastDataResult = { type: tr.tool, ...tr.result };
    }
  }

  return { navigationAction, toolResults, executorSummary, lastDataResult };
}

// ========== LLM 3: NARRADOR — genera respuesta final ==========
async function narrateResponse(userMessage, intentInfo, executorSummary, toolResults) {
  // Construimos un contexto compacto para el narrador
  const toolSummary = toolResults.map(tr => {
    const ok = tr.result.success !== false;
    return `- ${tr.tool}: ${ok ? 'éxito' : 'error'} — ${tr.result.message || JSON.stringify(tr.result).slice(0, 120)}`;
  }).join('\n');

  const context = `
El usuario dijo: "${userMessage}"
Intención detectada: ${intentInfo.resumen}
Acciones ejecutadas:
${toolSummary || '(ninguna acción de base de datos)'}
Resumen del ejecutor: ${executorSummary}
`.trim();

  try {
    const response = await client.chat.completions.create({
      model: MODEL_NARRATOR,
      max_completion_tokens: 300,
      temperature: 0.4,
      messages: [
        { role: 'system', content: NARRATOR_PROMPT },
        { role: 'user', content: context }
      ]
    });
    return response.choices[0].message.content.trim();
  } catch (e) {
    console.warn('[NARRATOR] Failed, using executor summary:', e.message);
    return executorSummary || 'Acción completada.';
  }
}

// ========== CHAT ENDPOINT ==========
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const userMessage = messages[messages.length - 1]?.content || '';

    // LLM 1: Clasificar intención (en paralelo con el inicio del ejecutor)
    const intentPromise = classifyIntent(userMessage);

    // LLM 2: Ejecutar loop agentic con herramientas
    const executionPromise = executeAgenticLoop(messages);

    // Esperamos ambos (intent puede llegar antes o después, no bloquea)
    const [intentInfo, execution] = await Promise.all([intentPromise, executionPromise]);

    const { navigationAction, toolResults, executorSummary, lastDataResult } = execution;

    // LLM 3: Narrar la respuesta final
    const finalMessage = await narrateResponse(
      userMessage,
      intentInfo,
      executorSummary,
      toolResults
    );

    return res.json({
      message: finalMessage,
      navigation: navigationAction,
      data: lastDataResult,
      // Metadata útil para depuración (puedes eliminar en producción)
      _meta: {
        intent: intentInfo,
        models: {
          intent: MODEL_INTENT,
          executor: MODEL_EXECUTOR,
          narrator: MODEL_NARRATOR
        }
      }
    });

  } catch (e) {
    console.error('Chat error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== CRON: Caducidad automática ==========
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
      console.log(`🤖 LLMs: intent=${MODEL_INTENT} | executor=${MODEL_EXECUTOR} | narrator=${MODEL_NARRATOR}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
