import { useEffect, useState } from "react";
import { X } from "lucide-react";
export default function Dialog({ title, onClose, children, wide = false }) {
  const [previousFocus] = useState(() => document.activeElement);
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector('[role="dialog"]');
    (
      dialog?.querySelector("input") || dialog?.querySelector("button")
    )?.focus();
    function key(event) {
      if (event.key === "Escape") {
        dialog.querySelector('[aria-label="Close dialog"]')?.click();
      }
      if (event.key === "Tab") {
        const items = [
          ...dialog.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ];
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      if (previousFocus?.isConnected) previousFocus.focus();
      else
        document
          .querySelector(".page-heading button, .task-toolbar button")
          ?.focus();
    };
  }, [previousFocus, wide]);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`dialog ${wide ? "details" : ""}`}
      >
        <header>
          <span className="eyebrow">TASKSPACE / TASK</span>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
