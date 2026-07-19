import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="bottom-right" toastOptions={{ className: '!bg-slate-800 !text-white !border !border-slate-700' }} />
    </BrowserRouter>
  </StrictMode>,
);
