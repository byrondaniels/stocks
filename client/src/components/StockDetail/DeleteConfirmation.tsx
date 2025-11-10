interface DeleteConfirmationProps {
  ticker: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal dialog for confirming stock removal from portfolio.
 *
 * @param ticker - Stock ticker symbol to display in confirmation message
 * @param onConfirm - Callback when user confirms deletion
 * @param onCancel - Callback when user cancels deletion
 *
 * @example
 * ```tsx
 * <DeleteConfirmation
 *   ticker="AAPL"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteConfirm(false)}
 * />
 * ```
 */
export function DeleteConfirmation({ ticker, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className="delete-confirmation">
      <div className="confirmation-content">
        <h3>Confirm Removal</h3>
        <p>Are you sure you want to remove {ticker} from your portfolio?</p>
        <div className="confirmation-actions">
          <button onClick={onConfirm} className="btn-confirm-delete">Yes, Remove</button>
          <button onClick={onCancel} className="btn-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}
