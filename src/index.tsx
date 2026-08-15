import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// jspaint (My Computer > Programs > Paint) picks its language from the
// visitor's own browser/OS locale by default, so on a Danish system its
// "Untitled" default file name comes out as "ikke-navngivet" — one desktop
// reading two languages depending on who's looking at it. Setting its own
// language key once, only if the visitor hasn't already picked one from
// Paint's own Extras > Language menu, keeps the whole machine in English
// without touching anything Paint owns.
try {
    if (!window.localStorage.getItem('jspaint language')) {
        window.localStorage.setItem('jspaint language', 'en');
    }
} catch {
    /* storage disabled — Paint falls back to the browser's own locale */
}

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
