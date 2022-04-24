import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';
import * as serviceWorker from './serviceWorker';
import './main.css';

// Polyfill GlobalThis test
// @ts-expect-error
// eslint-disable-next-line
global.globalThis = require('globalthis')();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Leave this here
serviceWorker.unregister();
