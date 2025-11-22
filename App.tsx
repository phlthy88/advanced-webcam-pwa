/**
 * App Component
 * Root component with error boundary and provider setup.
 */

import React from 'react';
import { ToastProvider } from './contexts/ToastContext';
import WebcamApp from './components/WebcamApp';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors for debugging
        console.error('Application error:', error);
        console.error('Component stack:', errorInfo.componentStack);
      }}
    >
      <ToastProvider>
        <WebcamApp />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
