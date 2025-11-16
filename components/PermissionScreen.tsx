
import React from 'react';

interface PermissionScreenProps {
  onRequest: () => void;
  error: string | null;
  isStarting: boolean;
}

const PermissionScreen: React.FC<PermissionScreenProps> = ({ onRequest, error, isStarting }) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <svg className="mx-auto h-16 w-16 text-blue-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Camera Access Required</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          This application needs access to your camera to provide advanced webcam controls. Please click the button below to grant permission.
        </p>
        <div className="mt-6">
          <button
            onClick={onRequest}
            disabled={isStarting}
            className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isStarting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Grant Camera Access'}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionScreen;
