import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import './index.css';
import App from './App.tsx';

const clientId = import.meta.env.VITE_CLIENT_ID;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DynamicContextProvider
      settings={{
        environmentId: clientId,
        walletConnectors: [EthereumWalletConnectors]
      }}
    >
      <App />
    </DynamicContextProvider>
  </StrictMode>
);
