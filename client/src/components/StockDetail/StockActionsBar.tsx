interface StockActionsBarProps {
  refreshing: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Action bar with buttons for refreshing data, editing position, and removing stock
 * from the portfolio.
 *
 * @param refreshing - Whether a refresh operation is in progress
 * @param onRefresh - Callback to refresh all stock data
 * @param onEdit - Callback to show the edit form
 * @param onDelete - Callback to show delete confirmation
 *
 * @example
 * ```tsx
 * <StockActionsBar
 *   refreshing={false}
 *   onRefresh={handleRefresh}
 *   onEdit={() => setShowEditForm(true)}
 *   onDelete={() => setShowDeleteConfirm(true)}
 * />
 * ```
 */
export function StockActionsBar({ refreshing, onRefresh, onEdit, onDelete }: StockActionsBarProps) {
  return (
    <div className="actions-bar">
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="btn-action btn-refresh"
      >
        {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
      </button>
      <button
        onClick={onEdit}
        className="btn-action btn-edit"
      >
        ✎ Edit Position
      </button>
      <button
        onClick={onDelete}
        className="btn-action btn-delete"
      >
        × Remove Stock
      </button>
    </div>
  );
}
