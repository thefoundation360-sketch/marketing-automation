import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#292524',
          color: '#fafaf9',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          maxWidth: '360px',
        },
        success: {
          iconTheme: { primary: '#F97316', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
        },
      }}
    />
  </React.StrictMode>,
)
