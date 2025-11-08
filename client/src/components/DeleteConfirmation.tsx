interface DeleteConfirmationProps {
  ticker: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmation({ ticker, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Remove Stock</h3>
        <p>
          Are you sure you want to remove <strong>{ticker}</strong> from your portfolio?
        </p>
        <p className="modal-warning">This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            Remove Stock
          </button>
        </div>
      </div>
    </div>
  );
}
