# Sistema Inteligente Estadístico para la Gestión Comercial de Distribuidora

Aplicación web que integra registro de ventas e inventario, un **motor de análisis
estadístico** (promedios móviles, tendencias, estadística descriptiva y proyección de
demanda), visualización mediante gráficos interactivos y **recomendaciones automáticas**,
con el fin de mejorar la toma de decisiones de compra, reposición e inventario de
distribuidoras de productos de consumo masivo.

> Proyecto de graduación · Universidad Mariano Gálvez de Guatemala
> Autor: **Francisco Alexander Chic Barrios** (Carné 9490-22-2513)

---

## 1. Arquitectura y stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React.js (Vite) + Bootstrap 5 + Chart.js |
| Backend / API REST | Node.js + Express |
| Motor estadístico | JavaScript (cálculo local, sin servicios externos) |
| IA (opcional) | Claude API (Anthropic) para recomendaciones cualitativas |
| Base de datos | Microsoft SQL Server |
| Autenticación | JWT + bcrypt · Roles: Administrador, Propietario, Empleado |
| Reportes | PDF (PDFKit) y Excel (ExcelJS) |
| Control de versiones | Git (ramas `main` y `develop`) · Azure Repos |

```
Desarrollo/
├── backend/            API REST + motor estadístico (Node.js + Express)
│   └── src/
│       ├── config/     Configuración (entorno y conexión a BD)
│       ├── middleware/ Autenticación JWT, roles y manejo de errores
│       ├── routes/     Endpoints por módulo (13 routers)
│       ├── services/   Lógica de inventario e IA
│       └── utils/      Motor estadístico y utilidades
├── frontend/           Interfaz web (React + Vite)
│   └── src/
│       ├── components/ Componentes reutilizables (Layout, Modal, UI)
│       ├── context/    Contexto de autenticación
│       └── pages/      12 pantallas del sistema
├── database/           Scripts SQL (esquema, roles) y utilidades
└── docs/               Documentación (modelo ER, manual, despliegue)
```

---

## 2. Requisitos previos

- **Node.js 18+** (probado con Node 24)
- **Microsoft SQL Server** con TCP/IP habilitado en el puerto 1433
- Navegador web moderno

---

## 3. Puesta en marcha (desarrollo local)

### 3.1 Base de datos

1. Crear la base y el login (una sola vez, con un usuario administrador de SQL Server):

   ```sql
   CREATE DATABASE DistribuidoraDB;
   CREATE LOGIN app_distribuidora WITH PASSWORD='Distri2026!Pro', CHECK_POLICY=OFF;
   USE DistribuidoraDB;
   CREATE USER app_distribuidora FOR LOGIN app_distribuidora;
   ALTER ROLE db_owner ADD MEMBER app_distribuidora;
   ```

2. Ejecutar el esquema y los datos base:

   ```bash
   sqlcmd -S localhost,1433 -U app_distribuidora -P "Distri2026!Pro" -C -I -d DistribuidoraDB -i database/schema.sql
   sqlcmd -S localhost,1433 -U app_distribuidora -P "Distri2026!Pro" -C -I -d DistribuidoraDB -i database/seed_roles.sql
   ```

   > Si SQL Server Express tiene TCP/IP deshabilitado, ejecute `database/habilitar_tcp_sqlserver.ps1`
   > como Administrador.

### 3.2 Backend

```bash
cd backend
npm install
cp .env.example .env      # ajuste las credenciales si es necesario
npm run dev               # API en http://localhost:4000
```

### 3.3 Frontend

```bash
cd frontend
npm install
npm run dev               # App en http://localhost:5173
```

### 3.4 Primer acceso

Abrir http://localhost:5173 → **Configuración inicial** para crear el primer
administrador. Luego iniciar sesión.

---

## 4. Módulos (Features) y funcionalidades

| Feature | Módulo | Historias de usuario |
|---------|--------|----------------------|
| FEAT-01 | Infraestructura y setup | Entorno, base de datos, repositorio |
| FEAT-02 | Autenticación y usuarios | Login, roles, recuperación de contraseña |
| FEAT-03 | Dashboard | KPIs, resumen de ventas, alertas |
| FEAT-04 | Inventario | CRUD de productos/categorías, entradas/salidas, alertas de stock mínimo |
| FEAT-05 | Ventas | Registro y consulta de ventas, importación histórica |
| FEAT-06 | Compras y proveedores | CRUD de proveedores, órdenes de compra y recepción |
| FEAT-07 | Análisis estadístico | Promedios móviles, tendencias, estadística descriptiva, proyección |
| FEAT-08 | Visualización | Gráficos interactivos de ventas, inventario y comparativas |
| FEAT-09 | Recomendaciones | Reposición, cantidad óptima de compra, ranking, IA |
| FEAT-10 | Reportes | Exportación en PDF y Excel |

Ver la documentación detallada en [`docs/`](docs/).

---

## 5. Despliegue en la nube

Consulte [`docs/DESPLIEGUE_NUBE.md`](docs/DESPLIEGUE_NUBE.md) para el despliegue en
capas gratuitas de Azure (Azure SQL Database + Azure App Service).
