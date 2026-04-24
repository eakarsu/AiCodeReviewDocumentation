import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((message, { title = 'Confirm', confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' } = {}) => {
    return new Promise((resolve) => {
      setDialog({ message, title, confirmLabel, cancelLabel, variant, resolve });
    });
  }, []);

  const handleConfirm = () => {
    dialog?.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog?.resolve(false);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{dialog.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{dialog.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="btn btn-secondary">{dialog.cancelLabel}</button>
              <button
                onClick={handleConfirm}
                className={`btn ${dialog.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
};
