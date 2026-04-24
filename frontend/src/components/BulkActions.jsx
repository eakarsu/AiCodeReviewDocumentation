import { useToast } from '../contexts/ToastContext';
import { useConfirm } from './ConfirmDialog';

function BulkActions({ selectedIds = [], resource, onBulkDelete, onBulkUpdate, onClearSelection }) {
  const { showToast } = useToast();
  const confirm = useConfirm();

  if (selectedIds.length === 0) return null;

  const handleBulkDelete = async () => {
    const confirmed = await confirm(
      `Are you sure you want to delete ${selectedIds.length} item(s)? This action cannot be undone.`,
      { title: 'Bulk Delete', confirmLabel: 'Delete All', variant: 'danger' }
    );
    if (!confirmed) return;

    try {
      await onBulkDelete(selectedIds);
      showToast(`${selectedIds.length} item(s) deleted`, 'success');
      onClearSelection();
    } catch (err) {
      showToast('Error deleting items: ' + err.message, 'error');
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await onBulkUpdate(selectedIds, { status });
      showToast(`${selectedIds.length} item(s) updated to ${status}`, 'success');
      onClearSelection();
    } catch (err) {
      showToast('Error updating items: ' + err.message, 'error');
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
        {selectedIds.length} selected
      </span>
      <div className="h-4 w-px bg-primary-300 dark:bg-primary-600" />
      <button
        onClick={() => handleStatusUpdate('completed')}
        className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
      >
        Mark Complete
      </button>
      <button
        onClick={() => handleStatusUpdate('pending')}
        className="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
      >
        Mark Pending
      </button>
      <button
        onClick={handleBulkDelete}
        className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
      >
        Delete
      </button>
      <button
        onClick={onClearSelection}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-auto"
      >
        Clear selection
      </button>
    </div>
  );
}

export default BulkActions;
