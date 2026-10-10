import { Router } from 'express';
import { query } from '../config/db.js';
import { autenticar, permitirRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(autenticar);

/* Configuración de la factura (campos opcionales visibles al cobrar).
   La lectura la puede hacer cualquier usuario (para saber qué mostrar);
   la modificación es solo del Administrador. */
router.get(
  '/factura',
  asyncHandler(async (_req, res) => {
    const { recordset } = await query('SELECT * FROM dbo.config_factura WHERE id = 1');
    const c = recordset[0] || {};
    res.json({
      ok: true,
      data: {
        mostrar_nit: !!c.mostrar_nit,
        mostrar_nombre_cliente: !!c.mostrar_nombre_cliente,
        mostrar_direccion: !!c.mostrar_direccion,
      },
    });
  })
);

router.put(
  '/factura',
  permitirRoles('Administrador'),
  asyncHandler(async (req, res) => {
    const { mostrar_nit, mostrar_nombre_cliente, mostrar_direccion } = req.body;
    await query(
      `UPDATE dbo.config_factura
       SET mostrar_nit = @nit, mostrar_nombre_cliente = @nom, mostrar_direccion = @dir,
           actualizado_en = SYSDATETIME()
       WHERE id = 1`,
      {
        nit: mostrar_nit ? 1 : 0,
        nom: mostrar_nombre_cliente ? 1 : 0,
        dir: mostrar_direccion ? 1 : 0,
      }
    );
    res.json({ ok: true });
  })
);

export default router;
