// OpenAI / Cerebras function calling format
const tools = [
  {
    type: "function",
    function: {
      name: "listar_productos",
      description: "Obtiene la lista de todos los productos activos del inventario",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "crear_producto",
      description: "Crea un nuevo producto en el inventario",
      parameters: {
        type: "object",
        properties: {
          nombre:          { type: "string",  description: "Nombre del producto" },
          categoria:       { type: "string",  description: "Categoría del producto" },
          precio:          { type: "number",  description: "Precio unitario en euros" },
          stock:           { type: "number",  description: "Cantidad inicial en stock" },
          unidad:          { type: "string",  description: "Unidad de medida (kg, litros, unidades, etc.)" },
          fecha_caducidad: { type: "string",  description: "Fecha de caducidad en formato ISO 8601 (opcional)" },
          proveedor_id:    { type: "string",  description: "ID del proveedor (opcional)" }
        },
        required: ["nombre", "precio", "stock"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "actualizar_producto",
      description: "Actualiza los datos de un producto existente",
      parameters: {
        type: "object",
        properties: {
          id:              { type: "string", description: "ID del producto a actualizar" },
          nombre:          { type: "string" },
          categoria:       { type: "string" },
          precio:          { type: "number" },
          stock:           { type: "number" },
          unidad:          { type: "string" },
          fecha_caducidad: { type: "string" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "eliminar_producto",
      description: "Elimina (desactiva) un producto del inventario",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID del producto a eliminar" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listar_proveedores",
      description: "Obtiene la lista de todos los proveedores activos",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "crear_proveedor",
      description: "Crea un nuevo proveedor",
      parameters: {
        type: "object",
        properties: {
          nombre:    { type: "string", description: "Nombre del proveedor" },
          contacto:  { type: "string", description: "Email o persona de contacto" },
          telefono:  { type: "string", description: "Teléfono de contacto" },
          direccion: { type: "string", description: "Dirección del proveedor" }
        },
        required: ["nombre"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "actualizar_proveedor",
      description: "Actualiza los datos de un proveedor existente",
      parameters: {
        type: "object",
        properties: {
          id:        { type: "string", description: "ID del proveedor" },
          nombre:    { type: "string" },
          contacto:  { type: "string" },
          telefono:  { type: "string" },
          direccion: { type: "string" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "eliminar_proveedor",
      description: "Elimina (desactiva) un proveedor",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID del proveedor a eliminar" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listar_pedidos",
      description: "Obtiene la lista de todos los pedidos a proveedores",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "crear_pedido",
      description: "Crea un nuevo pedido a proveedor. Los productos se añaden automáticamente al stock.",
      parameters: {
        type: "object",
        properties: {
          proveedor_id: { type: "string", description: "ID del proveedor" },
          items: {
            type: "array",
            description: "Lista de productos del pedido",
            items: {
              type: "object",
              properties: {
                producto_id:     { type: "string", description: "ID del producto" },
                cantidad:        { type: "number", description: "Cantidad pedida" },
                precio_unitario: { type: "number", description: "Precio unitario acordado" }
              },
              required: ["producto_id", "cantidad", "precio_unitario"]
            }
          },
          notas: { type: "string", description: "Notas adicionales del pedido" }
        },
        required: ["proveedor_id", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "actualizar_pedido",
      description: "Actualiza el estado o notas de un pedido",
      parameters: {
        type: "object",
        properties: {
          id:     { type: "string", description: "ID del pedido" },
          estado: { type: "string", description: "Estado: pendiente, recibido o cancelado" },
          notas:  { type: "string" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "eliminar_pedido",
      description: "Elimina un pedido",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID del pedido a eliminar" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listar_desechos",
      description: "Obtiene el registro de todos los desechos",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "registrar_desecho",
      description: "Registra un desecho de producto, reduciendo el stock automáticamente",
      parameters: {
        type: "object",
        properties: {
          producto_id: { type: "string", description: "ID del producto desechado" },
          cantidad:    { type: "number", description: "Cantidad desechada" },
          motivo:      { type: "string", description: "Motivo del desecho: caducidad, daño, deterioro u otro" },
          notas:       { type: "string", description: "Notas adicionales" }
        },
        required: ["producto_id", "cantidad", "motivo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "eliminar_desecho",
      description: "Elimina un registro de desecho",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID del desecho a eliminar" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "obtener_estadisticas",
      description: "Obtiene estadísticas completas del ERP: inventario, gastos, desechos, alertas de stock bajo y caducidad",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "mostrar_vista",
      description: "Cambia la vista del frontend para mostrar una sección específica del ERP",
      parameters: {
        type: "object",
        properties: {
          vista: {
            type: "string",
            description: "La sección a mostrar: productos, proveedores, pedidos, desechos, estadisticas o dashboard"
          }
        },
        required: ["vista"]
      }
    }
  }
];

module.exports = tools;
