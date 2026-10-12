/* ============================================================================
   Sistema Inteligente Estadístico para la Gestión Comercial de Distribuidora
   de Productos de Consumo Masivo
   ----------------------------------------------------------------------------
   Motor de base de datos : Microsoft SQL Server (2019+)
   Base de datos          : DistribuidoraDB
   Autor                  : Francisco Alexander Chic Barrios (UMG)
   Descripción            : Definición completa del esquema (DDL). Este archivo
                            es la fuente para generar el Modelo Entidad-Relación.
   ============================================================================ */

USE DistribuidoraDB;
GO

/* Requerido para columnas calculadas PERSISTED e índices asociados. */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ----------------------------------------------------------------------------
   Limpieza (orden inverso por dependencias). Solo afecta objetos del sistema.
   ---------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.recomendaciones','U')        IS NOT NULL DROP TABLE dbo.recomendaciones;
IF OBJECT_ID('dbo.alertas','U')                 IS NOT NULL DROP TABLE dbo.alertas;
IF OBJECT_ID('dbo.orden_compra_detalle','U')    IS NOT NULL DROP TABLE dbo.orden_compra_detalle;
IF OBJECT_ID('dbo.ordenes_compra','U')          IS NOT NULL DROP TABLE dbo.ordenes_compra;
IF OBJECT_ID('dbo.venta_detalle','U')           IS NOT NULL DROP TABLE dbo.venta_detalle;
IF OBJECT_ID('dbo.ventas','U')                  IS NOT NULL DROP TABLE dbo.ventas;
IF OBJECT_ID('dbo.movimientos_inventario','U')  IS NOT NULL DROP TABLE dbo.movimientos_inventario;
IF OBJECT_ID('dbo.productos','U')               IS NOT NULL DROP TABLE dbo.productos;
IF OBJECT_ID('dbo.categorias','U')              IS NOT NULL DROP TABLE dbo.categorias;
IF OBJECT_ID('dbo.proveedores','U')             IS NOT NULL DROP TABLE dbo.proveedores;
IF OBJECT_ID('dbo.usuarios','U')                IS NOT NULL DROP TABLE dbo.usuarios;
IF OBJECT_ID('dbo.roles','U')                   IS NOT NULL DROP TABLE dbo.roles;
GO

/* ============================================================================
   FEAT-02  ·  Seguridad: Roles y Usuarios
   ============================================================================ */
CREATE TABLE dbo.roles (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    nombre        NVARCHAR(50)  NOT NULL UNIQUE,
    descripcion   NVARCHAR(200) NULL,
    creado_en     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.usuarios (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    nombre            NVARCHAR(120) NOT NULL,
    email             NVARCHAR(160) NOT NULL UNIQUE,
    password_hash     NVARCHAR(255) NOT NULL,
    rol_id            INT           NOT NULL,
    activo            BIT           NOT NULL DEFAULT 1,
    reset_token       NVARCHAR(255) NULL,
    reset_expira      DATETIME2     NULL,
    ultimo_acceso     DATETIME2     NULL,
    creado_en         DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_usuarios_roles FOREIGN KEY (rol_id) REFERENCES dbo.roles(id)
);
GO
CREATE INDEX IX_usuarios_rol ON dbo.usuarios(rol_id);
GO

/* ============================================================================
   FEAT-04  ·  Inventario: Categorías y Productos
   ============================================================================ */
CREATE TABLE dbo.categorias (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    nombre        NVARCHAR(100) NOT NULL UNIQUE,
    descripcion   NVARCHAR(255) NULL,
    activo        BIT           NOT NULL DEFAULT 1,
    creado_en     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.productos (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    sku               NVARCHAR(50)  NOT NULL UNIQUE,
    codigo_barras     NVARCHAR(60)  NULL,          -- código de barras (lector USB)
    nombre            NVARCHAR(160) NOT NULL,
    categoria_id      INT           NULL,
    unidad            NVARCHAR(30)  NOT NULL DEFAULT 'unidad',
    precio_compra     DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_venta      DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_actual      DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_minimo      DECIMAL(12,2) NOT NULL DEFAULT 0,
    activo            BIT           NOT NULL DEFAULT 1,
    creado_en         DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_productos_categoria FOREIGN KEY (categoria_id) REFERENCES dbo.categorias(id)
);
GO
CREATE INDEX IX_productos_categoria     ON dbo.productos(categoria_id);
CREATE INDEX IX_productos_nombre        ON dbo.productos(nombre);
CREATE INDEX IX_productos_codigo_barras ON dbo.productos(codigo_barras);
GO

/* Movimientos de inventario: libro mayor de entradas y salidas (HU-11) */
CREATE TABLE dbo.movimientos_inventario (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    producto_id   INT           NOT NULL,
    tipo          NVARCHAR(10)  NOT NULL,   -- 'ENTRADA' | 'SALIDA'
    cantidad      DECIMAL(12,2) NOT NULL,
    stock_previo  DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_nuevo   DECIMAL(12,2) NOT NULL DEFAULT 0,
    motivo        NVARCHAR(200) NULL,       -- 'VENTA','COMPRA','AJUSTE','IMPORTACION'
    referencia    NVARCHAR(100) NULL,       -- id de venta/orden asociada
    usuario_id    INT           NULL,
    fecha         DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_mov_producto FOREIGN KEY (producto_id) REFERENCES dbo.productos(id),
    CONSTRAINT FK_mov_usuario  FOREIGN KEY (usuario_id)  REFERENCES dbo.usuarios(id),
    CONSTRAINT CK_mov_tipo     CHECK (tipo IN ('ENTRADA','SALIDA'))
);
GO
CREATE INDEX IX_mov_producto ON dbo.movimientos_inventario(producto_id);
CREATE INDEX IX_mov_fecha    ON dbo.movimientos_inventario(fecha);
GO

/* ============================================================================
   FEAT-06  ·  Compras: Proveedores y Órdenes de Compra
   ============================================================================ */
CREATE TABLE dbo.proveedores (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    nombre        NVARCHAR(160) NOT NULL,
    contacto      NVARCHAR(120) NULL,
    telefono      NVARCHAR(40)  NULL,
    email         NVARCHAR(160) NULL,
    direccion     NVARCHAR(255) NULL,
    activo        BIT           NOT NULL DEFAULT 1,
    creado_en     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.ordenes_compra (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    proveedor_id  INT           NOT NULL,
    fecha         DATE          NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    estado        NVARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE|RECIBIDA|ANULADA
    total         DECIMAL(12,2) NOT NULL DEFAULT 0,
    observaciones NVARCHAR(255) NULL,
    usuario_id    INT           NULL,
    creado_en     DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_oc_proveedor FOREIGN KEY (proveedor_id) REFERENCES dbo.proveedores(id),
    CONSTRAINT FK_oc_usuario   FOREIGN KEY (usuario_id)   REFERENCES dbo.usuarios(id),
    CONSTRAINT CK_oc_estado    CHECK (estado IN ('PENDIENTE','RECIBIDA','ANULADA'))
);
GO
CREATE INDEX IX_oc_proveedor ON dbo.ordenes_compra(proveedor_id);
CREATE INDEX IX_oc_fecha      ON dbo.ordenes_compra(fecha);
GO

CREATE TABLE dbo.orden_compra_detalle (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    orden_id       INT           NOT NULL,
    producto_id    INT           NOT NULL,
    cantidad       DECIMAL(12,2) NOT NULL,
    costo_unitario DECIMAL(12,2) NOT NULL,
    subtotal       AS (cantidad * costo_unitario) PERSISTED,
    CONSTRAINT FK_ocd_orden    FOREIGN KEY (orden_id)    REFERENCES dbo.ordenes_compra(id) ON DELETE CASCADE,
    CONSTRAINT FK_ocd_producto FOREIGN KEY (producto_id) REFERENCES dbo.productos(id)
);
GO
CREATE INDEX IX_ocd_orden ON dbo.orden_compra_detalle(orden_id);
GO

/* ============================================================================
   FEAT-05  ·  Ventas
   ============================================================================ */
CREATE TABLE dbo.ventas (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    fecha          DATE          NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    total          DECIMAL(12,2) NOT NULL DEFAULT 0,
    observaciones  NVARCHAR(255) NULL,
    nit            NVARCHAR(30)  NULL,   -- datos de cliente (opcionales según config)
    nombre_cliente NVARCHAR(160) NULL,   -- snapshot del nombre al momento de la venta
    direccion      NVARCHAR(255) NULL,   -- snapshot de la dirección
    cliente_id     INT           NULL,   -- cliente asociado (trazabilidad)
    direccion_id   INT           NULL,   -- dirección de entrega asociada
    usuario_id     INT           NULL,
    creado_en      DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_venta_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios(id)
    /* FK a clientes y direcciones se agregan al final (esas tablas se crean después) */
);
GO
CREATE INDEX IX_ventas_fecha ON dbo.ventas(fecha);
GO

CREATE TABLE dbo.venta_detalle (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    venta_id        INT           NOT NULL,
    producto_id     INT           NOT NULL,
    cantidad        DECIMAL(12,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal        AS (cantidad * precio_unitario) PERSISTED,
    CONSTRAINT FK_vd_venta    FOREIGN KEY (venta_id)    REFERENCES dbo.ventas(id) ON DELETE CASCADE,
    CONSTRAINT FK_vd_producto FOREIGN KEY (producto_id) REFERENCES dbo.productos(id)
);
GO
CREATE INDEX IX_vd_venta    ON dbo.venta_detalle(venta_id);
CREATE INDEX IX_vd_producto ON dbo.venta_detalle(producto_id);
GO

/* ============================================================================
   FEAT-03 / FEAT-09  ·  Alertas y Recomendaciones
   ============================================================================ */
CREATE TABLE dbo.alertas (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    tipo          NVARCHAR(30)  NOT NULL,   -- STOCK_MINIMO | REPOSICION
    producto_id   INT           NULL,
    mensaje       NVARCHAR(300) NOT NULL,
    nivel         NVARCHAR(20)  NOT NULL DEFAULT 'INFO', -- INFO|ADVERTENCIA|CRITICO
    resuelta      BIT           NOT NULL DEFAULT 0,
    creado_en     DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_alerta_producto FOREIGN KEY (producto_id) REFERENCES dbo.productos(id)
);
GO
CREATE INDEX IX_alertas_resuelta ON dbo.alertas(resuelta);
GO

CREATE TABLE dbo.recomendaciones (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    tipo          NVARCHAR(40)  NOT NULL,   -- REPOSICION | CANTIDAD_OPTIMA | INSIGHT_IA
    producto_id   INT           NULL,
    titulo        NVARCHAR(160) NOT NULL,
    contenido     NVARCHAR(MAX) NOT NULL,
    origen        NVARCHAR(20)  NOT NULL DEFAULT 'ESTADISTICO', -- ESTADISTICO | IA
    creado_en     DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_reco_producto FOREIGN KEY (producto_id) REFERENCES dbo.productos(id)
);
GO
CREATE INDEX IX_reco_tipo ON dbo.recomendaciones(tipo);
GO

/* ============================================================================
   Configuración de factura y catálogo de direcciones (Cluster / Casa)
   ============================================================================ */
IF OBJECT_ID('dbo.config_factura','U') IS NOT NULL DROP TABLE dbo.config_factura;
CREATE TABLE dbo.config_factura (
    id                     INT NOT NULL PRIMARY KEY,
    mostrar_nit            BIT NOT NULL DEFAULT 0,
    mostrar_nombre_cliente BIT NOT NULL DEFAULT 0,
    mostrar_direccion      BIT NOT NULL DEFAULT 0,
    actualizado_en         DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
INSERT INTO dbo.config_factura (id) VALUES (1);
GO

/* Se elimina primero direcciones (depende de clientes), luego clientes */
IF OBJECT_ID('dbo.direcciones','U') IS NOT NULL DROP TABLE dbo.direcciones;
IF OBJECT_ID('dbo.clientes','U')    IS NOT NULL DROP TABLE dbo.clientes;
GO

/* Clientes: un cliente (nombre, teléfono, NIT) puede tener varias direcciones */
CREATE TABLE dbo.clientes (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    nombre    NVARCHAR(160) NOT NULL,
    telefono  NVARCHAR(40)  NULL,
    nit       NVARCHAR(30)  NULL,
    activo    BIT           NOT NULL DEFAULT 1,
    creado_en DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO
CREATE INDEX IX_clientes_nombre ON dbo.clientes(nombre);
GO

/* Direcciones (Cluster / Casa) — cada una pertenece a un cliente */
CREATE TABLE dbo.direcciones (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    cliente_id INT           NOT NULL,
    cluster    NVARCHAR(60)  NOT NULL,
    casa       NVARCHAR(60)  NOT NULL,
    referencia NVARCHAR(255) NULL,
    activo     BIT NOT NULL DEFAULT 1,
    creado_en  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_direcciones_cliente FOREIGN KEY (cliente_id) REFERENCES dbo.clientes(id)
);
GO
CREATE INDEX IX_direcciones_cluster ON dbo.direcciones(cluster);
CREATE INDEX IX_direcciones_casa    ON dbo.direcciones(casa);
CREATE INDEX IX_direcciones_cliente ON dbo.direcciones(cliente_id);
GO

/* FK de ventas hacia clientes y direcciones (ya existen ambas tablas) */
ALTER TABLE dbo.ventas ADD CONSTRAINT FK_ventas_cliente   FOREIGN KEY (cliente_id)   REFERENCES dbo.clientes(id);
ALTER TABLE dbo.ventas ADD CONSTRAINT FK_ventas_direccion FOREIGN KEY (direccion_id) REFERENCES dbo.direcciones(id);
GO

PRINT 'Esquema DistribuidoraDB creado correctamente.';
GO
