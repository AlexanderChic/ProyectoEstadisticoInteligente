# Guía de despliegue en la nube (costo mínimo)

Esta guía despliega el sistema usando **capas gratuitas**, manteniendo Microsoft SQL
Server como motor (requisito del proyecto) mediante **Azure SQL Database**.

> Costo objetivo: **US$ 0** usando las capas gratuitas descritas. Requiere una cuenta
> de Azure (la cuenta de estudiante *Azure for Students* otorga crédito sin tarjeta).

## Arquitectura de despliegue

```
Navegador  ──►  Azure Static Web Apps (frontend React)  ──►  Azure App Service (API Express)  ──►  Azure SQL Database
                        [gratis]                                    [plan F1 gratis]                  [capa gratuita]
```

## 1. Base de datos → Azure SQL Database (capa gratuita)

1. En el portal de Azure: **Create a resource → Azure SQL → SQL Database**.
2. Cree un **servidor SQL** (recuerde usuario y contraseña de administrador).
3. En **Compute + storage**, elija la oferta **General Purpose · Serverless** y active
   la casilla **"Apply free offer"** (100,000 vCore-segundos y 32 GB gratis al mes).
4. Al crearse, abra **Query editor** y ejecute el contenido de `database/schema.sql` y
   `database/seed_roles.sql` (quite las líneas `USE DistribuidoraDB;` y `GO`, o ejecútelas por lotes).
5. En **Networking**, permita el acceso desde servicios de Azure y agregue su IP.
6. Copie la cadena de conexión (ADO.NET) para obtener servidor, usuario y contraseña.

## 2. Backend → Azure App Service (plan F1 gratis)

1. **Create a resource → Web App**. Runtime: **Node 20 LTS**, plan **F1 (Free)**.
2. En **Configuration → Application settings**, defina las variables de entorno
   (equivalentes al `.env`):

   | Variable | Valor |
   |----------|-------|
   | `DB_SERVER` | `su-servidor.database.windows.net` |
   | `DB_NAME` | `DistribuidoraDB` |
   | `DB_USER` | usuario administrador SQL |
   | `DB_PASSWORD` | contraseña |
   | `DB_PORT` | `1433` |
   | `DB_ENCRYPT` | `true` |
   | `DB_TRUST_CERT` | `false` |
   | `JWT_SECRET` | (una cadena larga y aleatoria) |
   | `CORS_ORIGIN` | URL del frontend desplegado |
   | `ANTHROPIC_API_KEY` | (opcional, para IA) |

   > Azure SQL **requiere** `DB_ENCRYPT=true`. La configuración por entorno del proyecto
   > ya lo soporta sin cambiar código.

3. Despliegue desde Azure Repos/GitHub (App Service ejecuta `npm install` y `npm start`).

## 3. Frontend → Azure Static Web Apps (gratis)

1. **Create a resource → Static Web App** (plan Free), conectado a su repositorio.
2. Configuración de build:
   - **App location:** `/frontend`
   - **Output location:** `dist`
   - Build command: `npm run build`
3. Defina la variable `VITE_API_URL` con la URL del App Service + `/api`.

## Alternativa aún más simple (Render / Railway)

Si prefiere evitar Azure para la app:
- **Backend:** [Render](https://render.com) Web Service (capa gratuita, Node).
- **Frontend:** Render Static Site o [Vercel](https://vercel.com) (gratis).
- **Base de datos:** mantenga **Azure SQL Database** (capa gratuita) por el requisito
  de SQL Server, apuntando las variables de entorno del backend a ella.

## Lista de verificación previa al despliegue

- [ ] `JWT_SECRET` cambiado por un valor largo y aleatorio.
- [ ] `DB_ENCRYPT=true` en producción (Azure SQL lo exige).
- [ ] `CORS_ORIGIN` apuntando al dominio real del frontend.
- [ ] `.env` **no** está versionado (ya está en `.gitignore`).
- [ ] Esquema y roles ejecutados en la base de datos de la nube.
