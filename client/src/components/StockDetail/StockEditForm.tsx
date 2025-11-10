interface EditFormData {
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
}

interface StockEditFormProps {
  formData: EditFormData;
  onChange: (data: EditFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Form for editing stock position details including shares, purchase price,
 * and purchase date.
 *
 * @param formData - Current form data
 * @param onChange - Callback when form data changes
 * @param onSave - Callback to save changes
 * @param onCancel - Callback to cancel editing
 *
 * @example
 * ```tsx
 * <StockEditForm
 *   formData={{ shares: 100, purchasePrice: 150.00, purchaseDate: '2024-01-01' }}
 *   onChange={setEditForm}
 *   onSave={handleSave}
 *   onCancel={() => setShowEditForm(false)}
 * />
 * ```
 */
export function StockEditForm({ formData, onChange, onSave, onCancel }: StockEditFormProps) {
  return (
    <div className="edit-form-section">
      <h3>Edit Position</h3>
      <div className="edit-form">
        <div className="form-row">
          <label>
            Shares:
            <input
              type="number"
              value={formData.shares}
              onChange={(e) => onChange({ ...formData, shares: parseFloat(e.target.value) })}
            />
          </label>
          <label>
            Purchase Price:
            <input
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => onChange({ ...formData, purchasePrice: parseFloat(e.target.value) })}
            />
          </label>
          <label>
            Purchase Date:
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => onChange({ ...formData, purchaseDate: e.target.value })}
            />
          </label>
        </div>
        <div className="form-actions">
          <button onClick={onSave} className="btn-save">Save</button>
          <button onClick={onCancel} className="btn-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}
