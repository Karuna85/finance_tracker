import type { FormEvent, ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  children: ReactNode;
}

export function Modal({ title, onClose, onSubmit, submitLabel, children }: ModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={onSubmit} aria-label={title}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">{children}</div>
        <div className="modal-actions">
          <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
