/* ============================================================================
   Migración 02: Configuración de factura, catálogo de direcciones (Cluster/Casa)
   y campos de cliente en las ventas.
   ============================================================================ */
USE DistribuidoraDB;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ---- Configuración de la factura (campos opcionales visibles al cobrar) ---- */
IF OBJECT_ID('dbo.config_factura','U') IS NULL
BEGIN
  CREATE TABLE dbo.config_factura (
    id                     INT NOT NULL PRIMARY KEY,
    mostrar_nit            BIT NOT NULL DEFAULT 0,
    mostrar_nombre_cliente BIT NOT NULL DEFAULT 0,
    mostrar_direccion      BIT NOT NULL DEFAULT 0,
    actualizado_en         DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
  INSERT INTO dbo.config_factura (id) VALUES (1);
END
GO

/* ---- Catálogo de direcciones: Cluster + Casa ---- */
IF OBJECT_ID('dbo.direcciones','U') IS NULL
BEGIN
  CREATE TABLE dbo.direcciones (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    cluster        NVARCHAR(60)  NOT NULL,
    casa           NVARCHAR(60)  NOT NULL,
    nombre_cliente NVARCHAR(160) NULL,
    referencia     NVARCHAR(255) NULL,
    activo         BIT NOT NULL DEFAULT 1,
    creado_en      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
  CREATE INDEX IX_direcciones_cluster ON dbo.direcciones(cluster);
  CREATE INDEX IX_direcciones_casa    ON dbo.direcciones(casa);
END
GO

/* ---- Campos de cliente en la venta ---- */
IF COL_LENGTH('dbo.ventas','nit') IS NULL
  ALTER TABLE dbo.ventas ADD nit NVARCHAR(30) NULL;
IF COL_LENGTH('dbo.ventas','nombre_cliente') IS NULL
  ALTER TABLE dbo.ventas ADD nombre_cliente NVARCHAR(160) NULL;
IF COL_LENGTH('dbo.ventas','direccion') IS NULL
  ALTER TABLE dbo.ventas ADD direccion NVARCHAR(255) NULL;
GO

PRINT 'Migración 02 aplicada.';
GO
