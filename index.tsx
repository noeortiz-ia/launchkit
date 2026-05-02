import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from './components/ThemeContext';
import { AISettingsProvider } from './components/AISettingsContext';
import { LanguageProvider } from './components/LanguageContext';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <LanguageProvider>
        <ThemeProvider>
          <AISettingsProvider>
            <App />
          </AISettingsProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ConvexAuthProvider>
  </React.StrictMode>
);