/* ============================================================================
   Migración 03: Tabla CLIENTES y asociación correcta de direcciones y ventas.
   ----------------------------------------------------------------------------
   - Un CLIENTE (nombre, teléfono, NIT) puede tener varias DIRECCIONES.
   - Las DIRECCIONES ahora pertenecen a un cliente (cliente_id FK).
   - Las VENTAS pueden asociarse a un cliente y a una dirección de entrega.
   ============================================================================ */
USE DistribuidoraDB;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ---- 1. Tabla de clientes ---- */
IF OBJECT_ID('dbo.clientes','U') IS NULL
BEGIN
  CREATE TABLE dbo.clientes (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    nombre    NVARCHAR(160) NOT NULL,
    telefono  NVARCHAR(40)  NULL,
    nit       NVARCHAR(30)  NULL,
    activo    BIT           NOT NULL DEFAULT 1,
    creado_en DATETIME2     NOT NULL DEFAULT SYSDATETIME()
  );
  CREATE INDEX IX_clientes_nombre ON dbo.clientes(nombre);
END
GO

/* ---- 2. direcciones.cliente_id (FK a clientes) ---- */
IF COL_LENGTH('dbo.direcciones','cliente_id') IS NULL
  ALTER TABLE dbo.direcciones ADD cliente_id INT NULL;
GO

/* Migrar los nombres que ya estaban embebidos en direcciones a la tabla clientes */
IF COL_LENGTH('dbo.direcciones','nombre_cliente') IS NOT NULL
BEGIN
  INSERT INTO dbo.clientes (nombre)
  SELECT DISTINCT nombre_cliente
  FROM dbo.direcciones
  WHERE nombre_cliente IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM dbo.clientes c WHERE c.nombre = dbo.direcciones.nombre_cliente);

  UPDATE d SET d.cliente_id = c.id
  FROM dbo.direcciones d
  JOIN dbo.clientes c ON c.nombre = d.nombre_cliente
  WHERE d.cliente_id IS NULL;
END
GO

/* FK direcciones -> clientes */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_direcciones_cliente')
  ALTER TABLE dbo.direcciones
    ADD CONSTRAINT FK_direcciones_cliente FOREIGN KEY (cliente_id) REFERENCES dbo.clientes(id);
GO

/* Quitar la columna duplicada nombre_cliente (ahora vive en clientes) */
IF COL_LENGTH('dbo.direcciones','nombre_cliente') IS NOT NULL
  ALTER TABLE dbo.direcciones DROP COLUMN nombre_cliente;
GO
CREATE INDEX IX_direcciones_cliente ON dbo.direcciones(cliente_id);
GO

/* ---- 3. ventas: cliente_id y direccion_id (trazabilidad de a quién se vendió) ---- */
IF COL_LENGTH('dbo.ventas','cliente_id') IS NULL
  ALTER TABLE dbo.ventas ADD cliente_id INT NULL;
IF COL_LENGTH('dbo.ventas','direccion_id') IS NULL
  ALTER TABLE dbo.ventas ADD direccion_id INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ventas_cliente')
  ALTER TABLE dbo.ventas ADD CONSTRAINT FK_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES dbo.clientes(id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ventas_direccion')
  ALTER TABLE dbo.ventas ADD CONSTRAINT FK_ventas_direccion FOREIGN KEY (direccion_id) REFERENCES dbo.direcciones(id);
GO

PRINT 'Migración 03 aplicada: clientes + asociaciones.';
GO
