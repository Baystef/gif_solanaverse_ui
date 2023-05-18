import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import WalletContextProvider from './WalletContextProvider';
import { Toaster } from 'react-hot-toast';
import './index.css';
require('@solana/wallet-adapter-react-ui/styles.css');

ReactDOM.render(
  <React.StrictMode>
    <WalletContextProvider>
      <App />
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          // Define default options
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },

          // Default options for specific types
          success: {
            duration: 3000,
            theme: {
              primary: 'green',
              secondary: 'black',
            },
          },
        }}
      />
    </WalletContextProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
