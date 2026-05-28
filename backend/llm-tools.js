// Gemini function declarations format
const tools = [
  {
    name: "listar_productos",
    description: "Obtiene la lista de todos los productos activos del inventario",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "crear_producto",
    description: "Crea un nuevo producto en el inventario",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre:          { type: "STRING",  description: "Nombre del producto" },
        categoria:       { type: "STRING",  description: "Categoría del producto" },
        precio:          { type: "NUMBER",  description: "Precio unitario en euros" },
        stock:           { type: "NUMBER",  description: "Cantidad inicial en stock" },
        unidad:          { type: "STRING",  description: "Unidad de medida (kg, litros, unidades, etc.)" },
        fecha_caducidad: { type: "STRING",  description: "Fecha de caducidad en formato ISO 8601 (opcional)" },
        proveedor_id:    { type: "STRING",  description: "ID del proveedor (opcional)" }
      },
      required: ["nombre", "precio", "stock"]
    }
  },
  {
    name: "actualizar_producto",
    description: "Actualiza los datos de un producto existente",
    parameters: {
      type: "OBJECT",
      properties: {
        id:              { type: "STRING", description: "ID del producto a actualizar" },
        nombre:          { type: "STRING" },
        categoria:       { type: "STRING" },
        precio:          { type: "NUMBER" },
        stock:           { type: "NUMBER" },
        unidad:          { type: "STRING" },
        fecha_caducidad: { type: "STRING" }
      },
      required: ["id"]
    }
  },
  {
    name: "eliminar_producto",
    description: "Elimina (desactiva) un producto del inventario",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "ID del producto a eliminar" }
      },
      required: ["id"]
    }
  },
  {
    name: "listar_proveedores",
    description: "Obtiene la lista de todos los proveedores activos",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "crear_proveedor",
    description: "Crea un nuevo proveedor",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre:    { type: "STRING", description: "Nombre del proveedor" },
        contacto:  { type: "STRING", description: "Email o persona de contacto" },
        telefono:  { type: "STRING", description: "Teléfono de contacto" },
        direccion: { type: "STRING", description: "Dirección del proveedor" }
      },
      required: ["nombre"]
    }
  },
  {
    name: "actualizar_proveedor",
    description: "Actualiza los datos de un proveedor existente",
    parameters: {
      type: "OBJECT",
      properties: {
        id:        { type: "STRING", description: "ID del proveedor" },
        nombre:    { type: "STRING" },
        contacto:  { type: "STRING" },
        telefono:  { type: "STRING" },
        direccion: { type: "STRING" }
      },
      required: ["id"]
    }
  },
  {
    name: "eliminar_proveedor",
    description: "Elimina (desactiva) un proveedor",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "ID del proveedor a eliminar" }
      },
      required: ["id"]
    }
  },
  {
    name: "listar_pedidos",
    description: "Obtiene la lista de todos los pedidos a proveedores",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "crear_pedido",
    description: "Crea un nuevo pedido a proveedor. Los productos se añaden automáticamente al stock.",
    parameters: {
      type: "OBJECT",
      properties: {
        proveedor_id: { type: "STRING", description: "ID del proveedor" },
        items: {
          type: "ARRAY",
          description: "Lista de productos del pedido",
          items: {
            type: "OBJECT",
            properties: {
              producto_id:     { type: "STRING", description: "ID del producto" },
              cantidad:        { type: "NUMBER", description: "Cantidad pedida" },
              precio_unitario: { type: "NUMBER", description: "Precio unitario acordado" }
            },
            required: ["producto_id", "cantidad", "precio_unitario"]
          }
        },
        notas: { type: "STRING", description: "Notas adicionales del pedido" }
      },
      required: ["proveedor_id", "items"]
    }
  },
  {
    name: "actualizar_pedido",
    description: "Actualiza el estado o notas de un pedido",
    parameters: {
      type: "OBJECT",
      properties: {
        id:     { type: "STRING", description: "ID del pedido" },
        estado: { type: "STRING", description: "Estado: pendiente, recibido o cancelado" },
        notas:  { type: "STRING" }
      },
      required: ["id"]
    }
  },
  {
    name: "eliminar_pedido",
    description: "Elimina un pedido",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "ID del pedido a eliminar" }
      },
      required: ["id"]
    }
  },
  {
    name: "listar_desechos",
    description: "Obtiene el registro de todos los desechos",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "registrar_desecho",
    description: "Registra un desecho de producto, reduciendo el stock automáticamente",
    parameters: {
      type: "OBJECT",
      properties: {
        producto_id: { type: "STRING", description: "ID del producto desechado" },
        cantidad:    { type: "NUMBER", description: "Cantidad desechada" },
        motivo:      { type: "STRING", description: "Motivo del desecho: caducidad, daño, deterioro u otro" },
        notas:       { type: "STRING", description: "Notas adicionales" }
      },
      required: ["producto_id", "cantidad", "motivo"]
    }
  },
  {
    name: "eliminar_desecho",
    description: "Elimina un registro de desecho",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "ID del desecho a eliminar" }
      },
      required: ["id"]
    }
  },
  {
    name: "obtener_estadisticas",
    description: "Obtiene estadísticas completas del ERP: inventario, gastos, desechos, alertas de stock bajo y caducidad",
    parameters: { type: "OBJECT", properties: {}, required: [] }
  },
  {
    name: "mostrar_vista",
    description: "Cambia la vista del frontend para mostrar una sección específica del ERP",
    parameters: {
      type: "OBJECT",
      properties: {
        vista: {
          type: "STRING",
          description: "La sección a mostrar: productos, proveedores, pedidos, desechos, estadisticas o dashboard"
        }
      },
      required: ["vista"]
    }
  }
];

module.exports = tools;
