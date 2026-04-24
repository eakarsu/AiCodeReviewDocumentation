import { useState, useEffect } from 'react';

function NewItemForm({ fields, onSubmit, onCancel, loading, initialData = {}, submitLabel = 'Create', sampleDataSets = [] }) {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: initialData[field.name] || field.defaultValue || '' }), {})
  );
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setFormData(fields.reduce((acc, field) => ({ ...acc, [field.name]: initialData[field.name] || field.defaultValue || '' }), {}));
      setErrors({});
      setTouched({});
    }
  }, [initialData, fields]);

  const validateField = (field, value) => {
    if (field.required && (!value || value === '')) {
      return `${field.label} is required`;
    }
    if (field.minLength && value && value.length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters`;
    }
    if (field.maxLength && value && value.length > field.maxLength) {
      return `${field.label} must be at most ${field.maxLength} characters`;
    }
    if (field.pattern && value && !field.pattern.test(value)) {
      return field.patternMessage || `${field.label} format is invalid`;
    }
    if (field.validate) {
      return field.validate(value, formData);
    }
    return null;
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      const field = fields.find(f => f.name === name);
      if (field) {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const field = fields.find(f => f.name === name);
    if (field) {
      const error = validateField(field, formData[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate all fields
    const newErrors = {};
    let hasError = false;
    for (const field of fields) {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        hasError = true;
      }
    }
    setErrors(newErrors);
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f.name]: true }), {}));
    if (hasError) return;
    onSubmit(formData);
  };

  const loadSampleData = (sampleData) => {
    setFormData(fields.reduce((acc, field) => ({
      ...acc,
      [field.name]: sampleData[field.name] || field.defaultValue || ''
    }), {}));
    setErrors({});
    setTouched({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {sampleDataSets.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">Load Sample Data for Testing:</p>
          <div className="flex flex-wrap gap-2">
            {sampleDataSets.map((sample, index) => (
              <button
                key={index}
                type="button"
                onClick={() => loadSampleData(sample.data)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors border border-blue-300 dark:border-blue-600"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="label">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              rows={field.rows || 4}
              className={`textarea font-mono text-sm ${touched[field.name] && errors[field.name] ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : ''}`}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(field.name, e.target.value)}
              onBlur={() => handleBlur(field.name)}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              className={`select ${touched[field.name] && errors[field.name] ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : ''}`}
              value={formData[field.name]}
              onChange={(e) => handleChange(field.name, e.target.value)}
              onBlur={() => handleBlur(field.name)}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || 'text'}
              id={field.name}
              name={field.name}
              className={`input ${touched[field.name] && errors[field.name] ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : ''}`}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(field.name, e.target.value)}
              onBlur={() => handleBlur(field.name)}
            />
          )}

          {touched[field.name] && errors[field.name] && (
            <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>
          )}

          {field.hint && !errors[field.name] && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{field.hint}</p>
          )}
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary flex items-center gap-2"
          disabled={loading}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default NewItemForm;
