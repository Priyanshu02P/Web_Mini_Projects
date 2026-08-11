import React from 'react';
import { createPortal } from 'react-dom';
import './DeleteConfirmModal.css';

export default function DeleteConfirmModal({ onConfirm, onCancel }) {
  return createPortal(
    <div
      className="delete-modal__backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-modal__icon">!</div>

        <div className="delete-modal__content">
          <h2 id="delete-modal-title">Delete task?</h2>
          <p>
            This task will be permanently deleted. This action cannot be undone.
          </p>
        </div>

        <div className="delete-modal__actions">
          <button
            type="button"
            className="delete-modal__button delete-modal__button--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="delete-modal__button delete-modal__button--delete"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}