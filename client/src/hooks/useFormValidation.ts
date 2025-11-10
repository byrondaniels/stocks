import { useState } from 'react';

/**
 * Validation rule function that returns an error message if invalid, or null if valid
 */
export type ValidationRule<T> = (value: T) => string | null;

/**
 * Validation rules object mapping field names to validation rule functions
 */
export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

/**
 * Custom hook for form validation with field-level error tracking.
 *
 * Provides:
 * - Field-level error messages
 * - Validate single field or entire form
 * - Clear errors for specific fields or all fields
 * - Check if form has any errors
 *
 * @template T - The type of the form data object
 * @param rules - Validation rules for each form field
 *
 * @returns Object with validation methods and error state
 *
 * @example
 * ```tsx
 * interface StockForm {
 *   ticker: string;
 *   shares: string;
 *   price: string;
 * }
 *
 * const rules: ValidationRules<StockForm> = {
 *   ticker: [
 *     (value) => !value ? 'Ticker is required' : null,
 *     (value) => value.length > 5 ? 'Ticker must be 5 characters or less' : null,
 *   ],
 *   shares: [
 *     (value) => !value ? 'Shares is required' : null,
 *     (value) => parseFloat(value) <= 0 ? 'Shares must be positive' : null,
 *   ],
 * };
 *
 * function StockForm() {
 *   const [form, setForm] = useState<StockForm>({ ticker: '', shares: '', price: '' });
 *   const { errors, validateField, validateForm, clearError, hasErrors } = useFormValidation(rules);
 *
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault();
 *     const isValid = validateForm(form);
 *     if (!isValid) return;
 *     // Submit form...
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={form.ticker}
 *         onChange={(e) => setForm({ ...form, ticker: e.target.value })}
 *         onBlur={() => validateField('ticker', form.ticker)}
 *       />
 *       {errors.ticker && <span className="error">{errors.ticker}</span>}
 *       <button disabled={hasErrors()}>Submit</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormValidation<T extends Record<string, any>>(
  rules: ValidationRules<T>
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  /**
   * Validates a single field and updates its error state
   * @param field - Field name to validate
   * @param value - Current value of the field
   * @returns true if valid, false if invalid
   */
  const validateField = (field: keyof T, value: T[keyof T]): boolean => {
    const fieldRules = rules[field];
    if (!fieldRules) {
      return true;
    }

    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }

    // Clear error if validation passes
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    return true;
  };

  /**
   * Validates all fields in the form
   * @param formData - Complete form data object
   * @returns true if all fields are valid, false if any field is invalid
   */
  const validateForm = (formData: T): boolean => {
    let isValid = true;
    const newErrors: Partial<Record<keyof T, string>> = {};

    for (const field in rules) {
      const fieldRules = rules[field];
      if (!fieldRules) continue;

      for (const rule of fieldRules) {
        const error = rule(formData[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
          break; // Stop at first error for this field
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Clears error for a specific field
   * @param field - Field name to clear error for
   */
  const clearError = (field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  /**
   * Clears all errors
   */
  const clearAllErrors = () => {
    setErrors({});
  };

  /**
   * Checks if there are any errors
   * @returns true if there are any errors, false otherwise
   */
  const hasErrors = (): boolean => {
    return Object.keys(errors).length > 0;
  };

  return {
    errors,
    validateField,
    validateForm,
    clearError,
    clearAllErrors,
    hasErrors,
  };
}
