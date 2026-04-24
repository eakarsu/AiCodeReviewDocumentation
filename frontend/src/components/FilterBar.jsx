function FilterBar({ filters = [], values = {}, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...values, [key]: value });
  };

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map(filter => (
        <div key={filter.key} className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{filter.label}:</label>
          <select
            value={values[filter.key] || ''}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">All</option>
            {filter.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}
      {Object.values(values).some(v => v) && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export default FilterBar;
