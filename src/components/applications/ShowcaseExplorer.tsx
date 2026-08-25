import React, { Suspense, lazy, useEffect } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
} from 'react-router-dom';
import Window from '../os/Window';
import VerticalNavbar from '../showcase/VerticalNavbar';
import useInitialWindowSize from '../../hooks/useInitialWindowSize';
import { markShowcaseVisited } from '../os/showcaseVisited';
import { trackEvent } from '../os/analyticsApi';
import { notePage } from '../os/usageStats';

/**
 * Records every page actually visited, for Clippy's showcase-open tips (see
 * `showcaseVisited.ts`) and for the `pageview` analytics event (see
 * `analyticsApi.ts`). Rendered inside `<Router>` purely to reach
 * `useLocation` — it has no UI of its own.
 */
const VisitTracker: React.FC = () => {
    const location = useLocation();
    useEffect(() => {
        markShowcaseVisited(location.pathname);
        trackEvent('pageview', location.pathname);
        notePage(location.pathname);
    }, [location.pathname]);
    return null;
};

/**
 * One chunk per page rather than one for the whole showcase.
 *
 * Opening My Showcase used to pull in every page's code (and, transitively,
 * every `import x from '*.jpg'` those pages make — several of which are
 * multi-megabyte gifs) in a single bundle, before any of it was needed. Home
 * and Software and Art all loading because someone opened the window to read
 * About was pure waste. `React.lazy` defers each page's module, and therefore
 * its asset imports, until its route is actually visited.
 *
 * `LazyImage` and `VideoAsset` (see src/components/general) do the same thing
 * one level down, deferring the *network fetch* of a given picture or clip
 * until it's about to scroll into view — the two techniques solve different
 * halves of the same problem and neither replaces the other.
 */
const Home = lazy(() => import('../showcase/Home'));
const About = lazy(() => import('../showcase/About'));
const Experience = lazy(() => import('../showcase/Experience'));
const Projects = lazy(() => import('../showcase/Projects'));
const Contact = lazy(() => import('../showcase/Contact'));
const SoftwareProjects = lazy(() => import('../showcase/projects/Software'));
const MusicProjects = lazy(() => import('../showcase/projects/Music'));
const ArtProjects = lazy(() => import('../showcase/projects/Art'));
const Papers = lazy(() => import('../showcase/experience/papers'));
const PractitionerArticles = lazy(
    () => import('../showcase/experience/PractitionerArticles')
);

export interface ShowcaseExplorerProps extends WindowAppProps {}

const ShowcaseExplorer: React.FC<ShowcaseExplorerProps> = (props) => {
    const { initWidth, initHeight } = useInitialWindowSize({ margin: 100 });

    return (
        <Window
            top={24}
            left={56}
            width={initWidth}
            height={initHeight}
            windowTitle="Jonas Kjeldmand Jensen - Portfolio & Selected Works 2026"
            windowBarIcon="windowExplorerIcon"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={'© Copyright 2026 Jonas Kjeldmand Jensen'}
        >
            <Router>
                <VisitTracker />
                <div className="site-page">
                    <VerticalNavbar />
                    {/* Only shows up on the first visit to a given page this
                        session — the chunk is cached after that, same as any
                        other script tag would be. */}
                    <Suspense
                        fallback={
                            <div
                                className="site-page-content"
                                style={{ alignItems: 'flex-start' }}
                            >
                                <p className="loading">Loading</p>
                            </div>
                        }
                    >
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/about" element={<About />} />
                            <Route
                                path="/experience"
                                element={<Experience />}
                            />
                            <Route
                                path="/experience/papers"
                                element={<Papers />}
                            />
                            <Route
                                path="/experience/practitioner-articles"
                                element={<PractitionerArticles />}
                            />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route
                                path="/projects/software"
                                element={<SoftwareProjects />}
                            />
                            <Route
                                path="/projects/music"
                                element={<MusicProjects />}
                            />
                            <Route
                                path="/projects/art"
                                element={<ArtProjects />}
                            />
                        </Routes>
                    </Suspense>
                </div>
            </Router>
        </Window>
    );
};

export default ShowcaseExplorer;
