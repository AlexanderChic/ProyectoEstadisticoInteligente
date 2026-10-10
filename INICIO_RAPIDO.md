# 🚀 Cómo correr el sistema en Visual Studio Code

## Paso 1 — Abrir el proyecto
1. Abre **Visual Studio Code**.
2. Menú **Archivo → Abrir carpeta...** y selecciona la carpeta:
   `...\Proyecto de graduación\Desarrollo`
   (la carpeta que contiene `backend`, `frontend`, `database` y `docs`).

## Paso 2 — Iniciar todo con un clic
1. Menú **Terminal → Ejecutar tarea...** (o presiona `Ctrl+Shift+P` y escribe *Run Task*).
2. Elige **▶ Iniciar todo el sistema**.

Esto abre dos terminales y levanta:
- **Backend (API)** en http://localhost:4000
- **Frontend (Web)** en http://localhost:5173

> Verás en la terminal del backend: `✅ Conectado a SQL Server` y `🚀 API escuchando...`

## Paso 3 — Abrir la aplicación
Abre en tu navegador: **http://localhost:5173**

- Usuario: `admin@distribuidora.com`
- Contraseña: `Admin1234`

> Si es una computadora nueva, primero usa **Configuración inicial** en la pantalla
> de login para crear tu administrador.

---

## Alternativa — con la terminal (sin tareas)
Abre **dos** terminales en VS Code (**Terminal → Nueva terminal**) y ejecuta:

**Terminal 1 (backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (frontend):**
```bash
cd frontend
npm run dev
```

---

## Requisitos (ya configurados en esta PC)
- ✅ **Node.js** instalado.
- ✅ **SQL Server Express** corriendo (se inicia solo con Windows) con TCP/IP en el
  puerto 1433. Si alguna vez falla la conexión, ejecuta como Administrador:
  `database/habilitar_tcp_sqlserver.ps1`.
- ✅ Base de datos `DistribuidoraDB` creada y dependencias instaladas.

## Si es la PRIMERA vez en una PC nueva
1. Instalar dependencias:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. Crear la base de datos y cargar el esquema (ver [README.md](README.md), sección 3.1).
3. Copiar `backend/.env.example` a `backend/.env` y ajustar credenciales.

## Problemas comunes
| Mensaje | Solución |
|---------|----------|
| `Port 4000 is already in use` | Ya hay un backend corriendo. Ciérralo o usa el que está activo. |
| `Failed to connect to SQL Server` | Verifica que el servicio SQL Server (SQLEXPRESS) esté iniciado y el puerto 1433 abierto. |
| La web abre pero no carga datos | Asegúrate de que el **backend** también esté corriendo. |
