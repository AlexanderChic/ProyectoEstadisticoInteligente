/* ============================================================================
   Datos base (catálogo de roles). NO incluye datos de negocio de demostración.
   Los usuarios reales se crean desde la aplicación.
   ============================================================================ */
USE DistribuidoraDB;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre = 'Administrador')
    INSERT INTO dbo.roles (nombre, descripcion) VALUES
        ('Administrador', 'Acceso total al sistema: configuración, usuarios y todos los módulos.');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre = 'Propietario')
    INSERT INTO dbo.roles (nombre, descripcion) VALUES
        ('Propietario', 'Dueño de la distribuidora: dashboards, análisis, reportes y decisiones.');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre = 'Empleado')
    INSERT INTO dbo.roles (nombre, descripcion) VALUES
        ('Empleado', 'Operación diaria: registro de ventas, inventario y compras.');
GO

PRINT 'Roles base insertados.';
GO
