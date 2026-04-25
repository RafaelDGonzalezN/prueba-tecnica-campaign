# Diseño del Agente de IA Automático

Para diseñar un agente de IA automático que pueda razonar y tomar decisiones implementaría la arquitectura **ReAct (Reason + Act)**, el loop de razonamiento seria un ciclo tres pasos: pensamiento que es la evaluacion de la información, acción que que es ejecutar la herraminetas y observación del resultado de la acción, repitiéndose hasta cumplir el objetivo.
Para su funcionamiento el agente necesita:

- **Orquestador (LLM):** Este es el componente que procesa la información recibida, razona y decide.
- **Tools (Herramientas):** Son las interfaces que le permiten al agente ejecutar acciones, el orquestador las consume explícitamente mediante tool-calling, generando argumentos estructurados que el sistema traduce en ejecuciones reales de:
  - Acceso a la **base de datos**.
  - Integración con **Discord**.

El agente esta configurado para ejecutarse a horas específicas, analiza la información y decide:

- Mandar una notificación por el medio de comunicación.
- Acceder nuevamente a la base de datos para cambiar el status de la campaña pausando dicha campaña.

Para auditar el agente crea un registro en la base de datos luego de cada acción para poder hacer seguimiento de las decisiones tomadas, guardando datos relevantes como: fecha/hora, campaña, razonamiento y acción ejecutada.

## Diagrama de Arquitectura (ASCII)

```text
+-------------------+        +-------------------------------------------------+
|                   |        |                 AGENTE DE IA                    |
|   Planificador    |        |                                                 |
|   (Cron/Timer)    | -----> |  +-------------------------------------------+  |
|                   | Triggers  |           Orquestador (LLM)               |  |
+-------------------+        |  |  (Analiza, Razona y Toma Decisiones)      |  |
                             |  +-------------------------------------------+  |
                             |           |                      |              |
                             |           v                      v              |
                             |  +-----------------+    +--------------------+  |
                             |  |  Tool: Base de  |    | Tool: Notificador  |  |
                             |  |      Datos      |    |     (Discord)      |  |
                             |  +-----------------+    +--------------------+  |
                             +-----------|----------------------|--------------+
                                         |                      |
                   +---------------------+-----------------+    |
                   |                     |                 |    |
             +-----v-----+         +-----v-----+           |    |
             | Leer Info |         |  Actualizar |         |    |
             | Campañas  |         |   Estado    |         |    |
             +-----------+         |  (Pausar)   |         |    |
                   |               +-----------+           |    |
                   |                     |                 |    |
                   |               +-----v-----+           |    |
                   +-------------> | Guardar   |           |    |
                                   | Log de    | <---------+    |
                                   | Auditoría |                |
                                   +-----------+                |
                                         |                      |
                                         v                      v
                             =========================================
                                       ENTORNOS EXTERNOS
                             =========================================
                                 [Base de Datos]           [Discord]
```
