import { createContext, useContext, useEffect, useState } from 'react';
import ModalVerPrecio from '../components/ModalVerPrecio.jsx';
import VentaRapida from '../components/VentaRapida.jsx';
import ModalProducto from '../components/ModalProducto.jsx';

/* Provee las acciones rápidas (modales) y sus atajos globales F1/F2/F3
   a toda la aplicación autenticada. */
const AccionesContext = createContext(null);

export function AccionesProvider({ children }) {
  const [modal, setModal] = useState(null); // 'precio' | 'venta' | 'producto' | null

  const abrir = (nombre) => setModal(nombre);
  const cerrar = () => setModal(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F1') { e.preventDefault(); setModal('precio'); }
      else if (e.key === 'F2') { e.preventDefault(); setModal('venta'); }
      else if (e.key === 'F3') { e.preventDefault(); setModal('producto'); }
      else if (e.key === 'Escape') { setModal(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AccionesContext.Provider value={{ abrir, cerrar, modal }}>
      {children}
      <ModalVerPrecio abierto={modal === 'precio'} onCerrar={cerrar} />
      <VentaRapida abierto={modal === 'venta'} onCerrar={cerrar} />
      <ModalProducto abierto={modal === 'producto'} onCerrar={cerrar} />
    </AccionesContext.Provider>
  );
}

export const useAcciones = () => useContext(AccionesContext);
