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
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          evmNetworks: [
            {
              chainId: 11155111,
              chainName: "Sepolia",
              iconUrls: ["https://app.dynamic.xyz/assets/networks/eth.svg"],
              nativeCurrency: {
                decimals: 18,
                name: "Sepolia Ether",
                symbol: "ETH",
              },
              networkId: 11155111,
              rpcUrls: ["https://sepolia.drpc.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
              vanityName: "Sepolia",
            },
          ],
        },
      }}
    >
      <App />
    </DynamicContextProvider>
  </StrictMode>
);
