
import React from 'react';
import { ToastProvider } from './contexts/ToastContext';
import WebcamApp from './components/WebcamApp';

function App() {
  return (
    <ToastProvider>
      <WebcamApp />
    </ToastProvider>
  );
}

export default App;
