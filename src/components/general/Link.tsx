import React from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';

export interface LinkProps {
    text: string;
    to: string;
    containerStyle?: React.CSSProperties;
    outsideTo?: string;
}

const Link: React.FC<LinkProps> = (props) => {
    const navigate = useNavigate();

    // get current location of react router
    const location = useLocation();
    const [isHere, setIsHere] = useState(false);

    // if current path is the same as the link path
    useEffect(() => {
        if (location.pathname === `/${props.to}`) {
            setIsHere(true);
        } else {
            setIsHere(false);
        }
        return () => {};
    }, [location, props.to]);

    const [active, setActive] = useState(false);

    /*
     * Both timers are tracked on a ref and cleared by an effect.
     *
     * This used to declare `let isMounted = true` inside the handler and
     * return a cleanup closing over it — but React does not call the return
     * value of a DOM event handler, so `isMounted` could only ever be true,
     * both guards were dead code, and clicking a nav link and closing the
     * window inside a tenth of a second navigated a router that was no longer
     * mounted.
     */
    const timers = useRef<number[]>([]);
    useEffect(
        () => () => {
            timers.current.forEach(window.clearTimeout);
            timers.current = [];
        },
        []
    );

    const handleClick = (e: any) => {
        e.preventDefault();
        setActive(true);
        if (location.pathname !== `/${props.to}`) {
            timers.current.push(
                window.setTimeout(() => navigate(`/${props.to}`), 100)
            );
        }
        timers.current.push(window.setTimeout(() => setActive(false), 100));
    };

    return (
        <RouterLink
            to={`/${props.to}`}
            onMouseDown={handleClick}
            style={Object.assign({}, { display: 'flex' }, props.containerStyle)}
        >
            {isHere && <div style={styles.hereIndicator} />}
            <h4
                className="router-link"
                style={Object.assign(
                    {},
                    styles.link,
                    active && { color: 'red' }
                )}
            >
                {props.text}
            </h4>
        </RouterLink>
    );
};

const styles: StyleSheetCSS = {
    link: {
        cursor: 'pointer',
        fontWeight: 'bolder',
        textDecoration: 'underline',
    },
    hereIndicator: {
        width: 4,
        height: 4,
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor: 'rgb(85, 26, 139)',
        alignSelf: 'center',
        borderRadius: '50%',
        marginRight: 6,
        textDecoration: 'none',
    },
};

export default Link;
