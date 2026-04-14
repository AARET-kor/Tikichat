import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import SidePanel from './SidePanel';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SidePanel />
    </AuthProvider>
  </StrictMode>
);
