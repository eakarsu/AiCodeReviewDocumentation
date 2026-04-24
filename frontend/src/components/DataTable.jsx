import Pagination from './Pagination';

function DataTable({
  columns, data, onRowClick, loading,
  // Pagination
  pagination, onPageChange, onLimitChange,
  // Sort
  sortKey, sortOrder, onSort,
  // Bulk select
  selectedIds, onSelectionChange,
  // Empty state
  emptyState
}) {
  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data.map(row => row.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds?.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...(selectedIds || []), id]);
    }
  };

  const hasBulkSelect = !!onSelectionChange;
  const allSelected = data?.length > 0 && selectedIds?.length === data?.length;

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {hasBulkSelect && <th className="w-10 px-3 py-3"></th>}
                {columns.map((col) => (
                  <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  {hasBulkSelect && <td className="px-3 py-4"><div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return emptyState || (
      <div className="card p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No items found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating a new item.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {hasBulkSelect && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => onSort && col.sortable !== false && onSort(col.key)}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      onSort && col.sortable !== false ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {onSort && col.sortable !== false && sortKey === col.key && (
                        <svg className={`w-3 h-3 ${sortOrder === 'ASC' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    selectedIds?.includes(row.id) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                  }`}
                >
                  {hasBulkSelect && (
                    <td className="w-10 px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds?.includes(row.id) || false}
                        onChange={(e) => handleSelectRow(e, row.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {row[col.key]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={row.id}
            onClick={() => onRowClick && onRowClick(row)}
            className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${
              selectedIds?.includes(row.id) ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {hasBulkSelect && (
                <input
                  type="checkbox"
                  checked={selectedIds?.includes(row.id) || false}
                  onChange={(e) => handleSelectRow(e, row.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
              )}
              <div className="flex-1 min-w-0">
                {columns.map((col, i) => (
                  <div key={col.key} className={i === 0 ? 'mb-2' : 'flex items-center justify-between py-1'}>
                    {i === 0 ? (
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </h4>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{col.label}</span>
                        <span className="text-sm">
                          {col.render ? col.render(row[col.key], row) : (
                            <span className="text-gray-900 dark:text-gray-100">{row[col.key]}</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </div>
  );
}

export default DataTable;
