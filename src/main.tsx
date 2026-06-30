import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { PSVProvider } from './store/PSVContext.tsx';
import { AuthProvider } from './auth/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PSVProvider>
          <App />
        </PSVProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
