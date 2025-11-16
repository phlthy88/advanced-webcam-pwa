
import React from 'react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  const toastStyles = {
    info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30',
    success: 'border-green-500 bg-green-50 dark:bg-green-900/30',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30',
    error: 'border-red-500 bg-red-50 dark:bg-red-900/30',
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`w-64 sm:w-80 p-4 rounded-lg shadow-lg border-l-4 text-gray-800 dark:text-gray-200 animate-slide-in ${toastStyles[toast.type]}`}
          role="alert"
        >
          <p className="font-medium text-sm">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
