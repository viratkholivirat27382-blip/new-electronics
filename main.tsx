import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { CategoriesProvider } from './context/CategoriesContext.tsx';
import { StoreProvider } from './context/StoreContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <CategoriesProvider>
          <App />
        </CategoriesProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>
);
