# PRUEBA TÉCNICA: Desarrollador de Automatizaciones e IA

## Tecnologías y Dependencias

- **Node.js** (v18 o superior recomendado)
- **TypeScript** (Ejecución mediante `tsx`)
- **Prisma ORM** (Conexión a BD)
- **Axios & Axios-Retry** (Peticiones HTTP)
- **OpenRouter SDK** (Integración LLM)
- **BullMQ & IORedis** (Manejo de colas y cron jobs)
- **n8n** (Plataforma de automatización para recibir y procesar los webhooks)

## ⚙️ Variables de Entorno (.env)

Antes de iniciar, debes crear un archivo `.env` en la raíz del proyecto. Hay un archivo `.env.example` que puedes usar como referencia. También puedes usar la siguiente plantilla para configurarlo correctamente:

```env
# -----------------------------------------------------------
# CONFIGURACIÓN DE BASE DE DATOS (PRISMA)
# -----------------------------------------------------------
DATABASE_URL="postgres://usuario:password@localhost:5432/tu_base_de_datos"

# -----------------------------------------------------------
# WEBHOOK DESTINO (N8N u otro servicio)
# -----------------------------------------------------------
WEBHOOK_URL="http://localhost:5678/webhook-test/campaign-reports"

# -----------------------------------------------------------
# INTELIGENCIA ARTIFICIAL (OPENROUTER)
# -----------------------------------------------------------
API_OPENROUTER="sk-or-v1-tu-api-key-aqui"
MODEL="google/gemini-2.5-flash"

# -----------------------------------------------------------
# REDIS (REQUERIDO PARA BULLMQ)
# -----------------------------------------------------------
REDIS_URL="redis://localhost:6379"
```

---

## 🚀 Primeros Pasos e Instalación

Sigue estos pasos cuidadosamente para poner el proyecto en marcha en tu máquina local:

### 1. Clonar e Instalar

Clona el repositorio y descarga todas las dependencias de Node:

```bash
git clone <url-del-repositorio>
cd prueba-tecnica-campaign
npm install
```

### 2. Configurar Prisma

Asegúrate de haber configurado tu `DATABASE_URL` en el archivo `.env`. Luego, genera el cliente de Prisma:

```bash
npx prisma generate
```

_(Nota: Si es una base de datos nueva, empujar el esquema usando `npx prisma db push` )._

### 3. Configuración de n8n

**Opción A: Usando NPX (Recomendado y rápido)**
Abre una nueva terminal y ejecuta:

```bash
npx n8n
```

_Esto iniciará la plataforma en el puerto 5678._

**Opción B: Usando Docker**
Si prefieres usar contenedores, ejecuta:

```bash
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

### 4. Levantar Infraestructura (Redis)

Para que el sistema de trabajos en segundo plano (BullMQ) funcione, **necesitas tener Redis corriendo**. El proyecto incluye un archivo `docker-compose.yml` preconfigurado:

```bash
docker-compose up -d
```

_Esto descargará y levantará un contenedor de Redis en el puerto `6379`._

---

## Ejecución del Proyecto

El archivo `package.json` cuenta con scripts preparados para correr la aplicación de distintas maneras según lo que desees probar:

### Opción 1: Ejecución Manual / Standalone

Si deseas ejecutar el flujo completo una única vez (obtener reportes -> procesar con IA -> enviar webhook):

```bash
npm run start
```

### ⚙️ Opción 2: Ejecución Automatizada (Worker recurrente)

Si deseas encender el Worker para que procese automáticamente las campañas en segundo plano **cada 2 minutos**:

```bash
npm run worker
```

_(Asegúrate de que Redis esté encendido antes de correr este comando)._

---

## Parte 1 — Integración de API y Lógica de Negocio en TypeScript

Para elegir la api utilice la herramienta "https://retool.com/api-generator", la cual permite crear una api con diferentes parametros. Elegí esta api por varios motivos:

- Es publica y no requiere autenticación(facilita la revision por parte del reclutador).
- Pude definir los valaros para el campo que simula las metricas para que fueran acordes a los requerimientos de la prueba.

## Parte 2 — Flujo en N8N

Para la automatización de las acciones a partir de los datos, se creó un flujo de trabajo en n8n que recibe el payload a través de un Webhook. El flujo se divide en dos ramas principales de procesamiento, que se ejecutan en paralelo:

![Flujo Completo N8N](./src/images/n8n.png)

1. **Procesamiento de Reportes (`campaignReports`):**
   - Se extrae el listado de campañas y un nodo **Switch** filtra cada campaña según su estado (`status`):
     - **Crítico (`critical`):** Se agrupan todas las campañas críticas en un único texto y se genera un mensaje de alerta consolidado que se envía a un canal de **Discord**.

       ![Alerta Discord](./src/images/discord-critical-campaign.png)

     - **Advertencia (`warning`):** Las campañas con este estado se redirigen a un nodo de **Google Sheets**, donde cada registro es anexado como una nueva fila (incluyendo ID, Nombre, Métrica, Estado y Fecha).

       ![Google Sheets](./src/images/google-sheets.png)

2. **Procesamiento del Resumen de la IA (`campaignSummary`):**
   - Un nodo procesa el resumen general de las campañas, la lista de campañas críticas y las acciones sugeridas proporcionadas por el LLM.
   - Si los datos son válidos, se formatea la respuesta en un reporte estructurado y se notifica al canal de **Discord**.

     ![Reporte LLM](./src/images/report-llm.png)

   - **Manejo de Errores:** Si el objeto `campaignSummary` no se envía correctamente o la IA indica un fallo de conexión, se captura el error y se envía una notificación de alerta dedicada a **Discord** para informar sobre la eventualidad y evitar que el flujo falle silenciosamente.

     ![Error LLM](./src/images/error.png)

## Parte 3 — Extensión de Código y Base de Datos

- **3A:** En la revisión del código original, identifiqué 4 problemas clave y los solucioné de la siguiente manera:
  1. **Falta de manejo de errores (try/catch):** Una caída en la red o un error crashearía la aplicación.
     - _Solución:_ Agregué un bloque `try/catch` validando el estado HTTP para capturar fallos de red y lanzar un error descriptivo.
  2. **Posible error matemático (División por cero):** Si `impressions` venía nulo o en 0, el cálculo de CTR daría `NaN` o `Infinity`.
     - _Solución:_ Asigné valores por defecto e incluí un operador ternario (`impressions > 0 ? ... : 0`) para garantizar un cálculo seguro.
  3. **Falta de tipado estricto:** El código original no garantizaba la estructura devuelta por la API.
     - _Solución:_ Creé la interfaz `CampaignAPIResponse` para estandarizar las entradas y salidas, previniendo errores de ejecución.
  4. **Peticiones no optimizadas:** El ciclo iteraba secuencialmente, lo cual es ineficiente. Llamar todo de golpe generaría errores de "Rate Limit".
     - _Solución:_ Implementé concurrencia por lotes con `Promise.all` y `CONCURRENCY_LIMIT = 3.

  5. **Ademas agrego la funcion filterAndSortCampaigns()** que permite filtrar las campañas por CTR menor a 0.02 y ordenarlas de menor a mayor CTR. Tal cual como la prueba indica.

- **3B:** La query que hice primero usa `groupBy` sobre las métricas de los últimos 7 días calculando el `_avg` de ROAS de forma ascendente. Tras conseguir ese ranking, hace una segunda consulta para obtener los datos de la campaña y su operador respectivo. Finalmente, cruza ambos datos en memoria agrupándolos por nombre del operador.
  - **¿Por qué la estructuré así?** Prisma ORM tiene ciertas limitaciones nativas al intentar mezclar operaciones de agregación (`groupBy`) con uniones profundas de tablas (`include`) en la misma consulta. Para no perder la seguridad de tipos estricta y evitar inyecciones de _Raw SQL_, la mejor opcion que encontre fue delegar el cálculo del promedio a la base de datos en una consulta rápida, para luego resolver la relaciones y agrupacion de los datos.

## Parte 4 — Integración con LLM

-**Api Utilizada:** Se utilizo la api `OpenRouter` no solo por la recomendación de la prueba si no por su facilidad de uso y su amplia variedad de modelos gratuitos disponibles. La manera de integrar la api fue mediante el SDK de OpenRouter.

- **Ingeniería del Prompt (Prompt Engineering):**
  Se toman los datos obtenidos de la Parte 1 y se pasan al prompt. Se instruye al modelo actuar como un **Analista de Datos Senior**, pidiéndole que evalúe las campañas y genere un análisis ejecutivo.

- **Salida Estructurada (JSON Mode):**
  Para garantizar que la aplicación pueda consumir los datos de la IA sin fallos, se configuró la petición para obligar al modelo a responder un json establecido en el prompt. El modelo mapea su razonamiento en tres partes:
  - `summary`: Resumen general del estado de las campañas.
  - `criticalCampaigns`: Arreglo identificando las campañas criticas.
  - `suggestedActions`: Sugerencias de mejoras.

- **Manejo de Errores y Fallbacks:**
  Dado que las APIs de IA pueden fallar o demorar, el código implementa un `try/catch` que intercepta cualquier error de red o de parseo. Si la IA falla, el sistema no crashea; en su lugar, devuelve un objeto _fallback_ con un mensaje de alerta predeterminado. Esto asegura que la cadena de trabajo continúe y el Webhook siga operando de manera predecible.
