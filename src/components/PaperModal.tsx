"use client";

import { useEffect, useRef, useState } from "react";

const MIN_W = 340;
function maxW() {
  return Math.min(960, Math.round(window.innerWidth * 0.94));
}

// A "paper" modal whose width is resized by dragging either side edge. The box
// is centered, so width = 2 × distance from the viewport centre to the pointer.
// Content reflows (more image columns) instead of scaling up.
export default function PaperModal({
  onClose,
  onDelete,
  children,
}: {
  onClose: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState<number | null>(null);
  const resizing = useRef(false);
  const downOnOverlay = useRef(false); // only close if the press STARTED on the backdrop

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!resizing.current) return;
      const centerX = window.innerWidth / 2;
      setWidth(Math.max(MIN_W, Math.min(maxW(), Math.round(Math.abs(e.clientX - centerX) * 2))));
    }
    function up() {
      if (!resizing.current) return;
      resizing.current = false;
      document.body.style.userSelect = "";
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("keydown", onKey);
      document.body.style.userSelect = "";
    };
  }, [onClose]);

  function start(e: React.PointerEvent) {
    e.preventDefault();
    resizing.current = true;
    document.body.style.userSelect = "none";
  }

  return (
    <div
      className="modal-bg paper-bg open"
      onPointerDown={(e) => {
        downOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnOverlay.current) onClose();
        downOnOverlay.current = false;
      }}
    >
      <div className="papershell" style={width ? { width } : undefined}>
        <div className="redge l" onPointerDown={start} title="Drag to resize" />
        <div className="redge r" onPointerDown={start} title="Drag to resize" />
        <div className="ptools">
          {onDelete ? (
            <button className="ptool del" onClick={onDelete} title="Delete entry" aria-label="Delete entry">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </svg>
            </button>
          ) : null}
          <button className="ptool" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="paper">{children}</div>
      </div>
    </div>
  );
}
