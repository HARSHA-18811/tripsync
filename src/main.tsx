import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './store';
import { AuthProvider } from './auth';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
