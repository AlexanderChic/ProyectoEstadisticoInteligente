/** Modal simple basado en clases de Bootstrap (sin depender de su JS). */
export default function Modal({ titulo, children, onClose, onGuardar, guardando, textoGuardar = 'Guardar', size = '' }) {
  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog">
        <div className={`modal-dialog ${size} modal-dialog-centered`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{titulo}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">{children}</div>
            {onGuardar && (
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={onClose} disabled={guardando}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={onGuardar} disabled={guardando}>
                  {guardando ? 'Guardando...' : textoGuardar}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}
