# Manual de usuario

Sistema Inteligente Estadístico para la Gestión Comercial de Distribuidora.

## Acceso al sistema

- **Configuración inicial:** la primera vez, en la pantalla de login elija
  *Configuración inicial* y cree el usuario Administrador.
- **Iniciar sesión:** ingrese correo y contraseña.
- **Recuperar contraseña:** desde el login, opción *¿Olvidó su contraseña?*.

## Roles y permisos

| Rol | Permisos |
|-----|----------|
| **Administrador** | Todo, incluida la gestión de usuarios. |
| **Propietario** | Todos los módulos operativos, análisis, recomendaciones y reportes. |
| **Empleado** | Operación diaria: productos, inventario, ventas y compras. |

## Flujo de trabajo recomendado

1. **Categorías** → cree las categorías de sus productos (ej. Bebidas, Snacks, Limpieza).
2. **Productos** → registre el catálogo con precios, stock inicial y stock mínimo.
   - Alternativa: **Importar Excel** para carga masiva del inventario inicial.
3. **Proveedores** → registre a sus proveedores.
4. **Compras** → cree órdenes de compra y, al recibirlas, el stock ingresa automáticamente.
5. **Ventas** → registre las ventas diarias; el stock se descuenta solo.
   - Alternativa: **Importar Excel** para cargar el histórico de ventas.
6. **Dashboard** → consulte KPIs, ventas y alertas activas.
7. **Análisis Estadístico** → seleccione un producto y obtenga promedios móviles,
   tendencia, estadística descriptiva y proyección de demanda.
8. **Recomendaciones** → vea qué reponer, la cantidad óptima de compra sugerida, el
   ranking de más vendidos y (opcional) un análisis con IA.
9. **Reportes** → exporte ventas, inventario y estadísticas en PDF o Excel.

## Módulos en detalle

### Dashboard
Muestra indicadores clave (productos activos, ventas del mes, valor de inventario,
alertas), un gráfico de ventas de los últimos 30 días, ventas por categoría y la lista
de alertas activas (que puede marcar como resueltas).

### Inventario
Registre entradas (compras, ajustes) y salidas (mermas, ajustes). Cada movimiento queda
en el historial con stock previo y nuevo. Cuando un producto baja del mínimo, se genera
una alerta automática.

### Análisis Estadístico
- **Promedio móvil:** suaviza la serie de ventas semanales para ver la tendencia real.
- **Tendencia:** dirección (creciente/decreciente/estable) por regresión lineal, con R².
- **Estadística descriptiva:** media, mediana, desviación estándar, percentiles, etc.
- **Proyección de demanda:** estima las ventas de las próximas semanas.

### Recomendaciones
- **Reposición:** productos por debajo del mínimo y la cantidad faltante.
- **Cantidad óptima de compra:** cuánto comprar según la demanda proyectada.
- **Ranking:** productos más vendidos por unidades e ingresos.
- **Análisis con IA:** sugerencias cualitativas (requiere configurar la clave de API).

### Ingreso Rápido / Escáner (lector de código de barras)
Módulo para agilizar el ingreso de datos con un lector de código de barras USB
(que funciona como teclado: escribe el código y presiona Enter).

- **Registrar el código:** en Productos, capture el *Código de barras* de cada
  producto (puede escanearlo directamente en ese campo).
- **Uso del escáner:** abra *Ingreso Rápido / Escáner* y escanee un producto:
  - **Modo "Confirmar cada uno":** muestra el producto y usted elige Entrada (+)
    o Salida (−) con la cantidad indicada.
  - **Modo "Entrada automática":** cada escaneo suma automáticamente la cantidad
    configurada al inventario (ideal para recibir mercadería en serie).
- Si el código escaneado no existe, el sistema ofrece **registrar el producto**
  en el momento, con el código ya cargado.
- Cada operación queda en el **historial de la sesión** y actualiza el stock.

### Importar desde Excel
Suba archivos `.xlsx` con las columnas indicadas en cada sección. Las plantillas de
ejemplo están en `database/plantillas/`.

## Formato de las plantillas de importación

**Productos / inventario inicial:**
`sku, nombre, categoria, unidad, precio_compra, precio_venta, stock_actual, stock_minimo`

**Ventas históricas:**
`fecha, sku, cantidad, precio_unitario`
