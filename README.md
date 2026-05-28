# ERP Inteligente — LLM-Powered

ERP conversacional donde **toda la interacción del usuario se realiza a través de un LLM** (Claude Sonnet 4). El modelo actúa como orquestador entre el usuario y el backend.

## Arquitectura

```
┌──────────────────────────────────────────────────────┐
│                    docker-compose                    │
│                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ Frontend │───▶│   Backend    │───▶│  MongoDB  │  │
│  │  React   │    │  Node/Express│    │   7.0     │  │
│  │ port:3000│    │  port:3001   │    │ port:27017│  │
│  └──────────┘    └──────┬───────┘    └───────────┘  │
│                         │                            │
│                  ┌──────▼───────┐                   │
│                  │ Anthropic API│                   │
│                  │  claude-sonnet-4  │                   │
│                  └──────────────┘                   │
└──────────────────────────────────────────────────────┘
```

## Por qué MongoDB (no otra BD)

- **Esquema flexible**: Los productos/pedidos tienen estructuras que varían (ítems de pedido anidados, campos opcionales como fecha_caducidad). MongoDB permite esto sin migraciones.
- **Documentos embebidos**: Los ítems de un pedido se guardan embebidos, lo que evita JOINs costosos para las consultas típicas del ERP.
- **Facilidad de setup**: Docker oficial con health-check, sin necesidad de ORM complejo.
- **JSON nativo**: El backend devuelve documentos MongoDB directamente al LLM como JSON, sin transformaciones.

## Modelos LLM

| Modelo | Rol |
|--------|-----|
| **claude-sonnet-4** (orquestador) | Interpreta intención del usuario, llama a herramientas del backend, genera respuesta en lenguaje natural |
| **claude-sonnet-4** (herramientas) | Dentro del mismo modelo, el tool-use permite CRUD completo via function calling |
| **claude-sonnet-4** (contexto) | Mantiene historial de conversación para contexto multi-turno |

> Los tres "modelos" son el mismo modelo claude-sonnet-4 operando en distintos modos (conversación, tool-use, agentic loop).

## CRUD implementado

- **Productos**: crear, listar, actualizar, eliminar (soft-delete) + gestión de caducidad automática
- **Proveedores**: CRUD completo
- **Pedidos a proveedor**: CRUD + actualización automática de stock al recibir pedido
- **Desechos**: CRUD + deducción automática de stock + registro de pérdidas económicas

## Caducidad automática

Un cron job se ejecuta **cada hora** y:
1. Busca productos con `fecha_caducidad < now` y `stock > 0`
2. Registra un desecho automático con motivo "caducidad"
3. Pone el stock a 0 y desactiva el producto

## Estadísticas incluidas

1. Stock por categoría (barras)
2. Desechos por motivo (pie chart)
3. Gastos en pedidos por mes (línea, últimos 6 meses)
4. Top 5 productos por valor de inventario (barras horizontales)
5. Alertas de stock bajo (<10 unidades)
6. Alertas de productos próximos a caducar (7 días)

## Inicio rápido

### 1. Prerrequisitos
- Docker Desktop instalado
- Clave API de Anthropic

### 2. Configuración

```bash
git clone <repo>
cd erp-llm
cp .env.example .env
# Edita .env y añade tu ANTHROPIC_API_KEY
```

### 3. Lanzar

```bash
docker compose up --build
```

### 4. Acceder

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **MongoDB**: localhost:27017

## Uso

Escribe en el chat natural:
- "Muéstrame todos los productos"
- "Crea un producto llamado Leche, categoría Lácteos, precio 1.20, stock 50 unidades"
- "Añade un proveedor llamado Lácteos del Norte con teléfono 951234567"
- "Haz un pedido al proveedor [id] con 20 unidades del producto [id] a 1€ cada uno"
- "Registra un desecho de 5 kg de Tomates por deterioro"
- "Ver estadísticas de inventario"

## Estructura de archivos

```
erp-llm/
├── docker-compose.yml
├── .env.example
├── mongo-init/
│   └── init.js              # Datos iniciales + índices
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js            # Express + LLM agentic loop + cron
│   ├── routes.js            # REST API CRUD
│   ├── models.js            # Mongoose schemas
│   └── llm-tools.js         # Definición de herramientas para Claude
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.jsx           # Layout principal + chat
        └── components/
            ├── DataView.jsx          # Tablas de datos
            └── EstadisticasView.jsx  # Gráficos con Recharts
```
