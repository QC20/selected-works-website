import './App.css';
import Desktop from './components/os/Desktop';
import AccessiblePage from './components/accessible/AccessiblePage';

function App() {
    // A real route, not client-side routing into it: someone arriving with a
    // screen reader or on a low-powered device needs this to work as the very
    // first thing that loads, not as something reachable only after the
    // desktop (and everything it drags in) has already rendered.
    if (window.location.pathname === '/accessible') {
        return <AccessiblePage />;
    }

    return (
        <div className="App">
            <a href="/accessible" className="skip-link">
                Skip to a plain, accessible version of this site
            </a>
            <Desktop />
        </div>
    );
}

export default App;
