import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Admin from './Admin';

const isAdmin = window.location.pathname.startsWith('/admin');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isAdmin ? <Admin /> : <App />}
  </React.StrictMode>
);
