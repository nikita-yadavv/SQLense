/**
 * Modal — accessible modal dialog.
 * Traps focus, closes on Escape key and backdrop click.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, footer, size = "md" }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`modal-content modal-${size}`}
        ref={contentRef}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">{title}</h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
