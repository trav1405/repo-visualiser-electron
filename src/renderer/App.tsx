import React from 'react';
import { CookiesProvider } from 'react-cookie';
import { HashRouter } from 'react-router-dom';
import { Root } from './Pages/Root';

export const App: React.FC = () => (
  <CookiesProvider>
    <HashRouter>
      <Root />
    </HashRouter>
  </CookiesProvider>
);

// export const App = AppComponent;

// window.store = store;
