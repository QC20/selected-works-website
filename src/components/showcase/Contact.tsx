import React, { useEffect, useState, useCallback } from 'react';
import colors from '../../constants/colors';
import ghIcon from '../../assets/pictures/contact-gh.png';
import inIcon from '../../assets/pictures/contact-in.png';
import hdIcon from '../../assets/pictures/contact-hd.png';
import ResumeDownload from './ResumeDownload';

export interface ContactProps {}

// function to validate email
const validateEmail = (email: string) => {
    const re =
        // eslint-disable-next-line
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

interface SocialBoxProps {
    icon: string;
    link: string;
}

const SocialBox: React.FC<SocialBoxProps> = ({ link, icon }) => {
    return (
        <a rel="noreferrer" target="_blank" href={link}>
            <div className="big-button-container" style={styles.social}>
                <img src={icon} alt="" style={styles.socialImage} />
            </div>
        </a>
    );
};

const Contact: React.FC<ContactProps> = (props) => {
    const [company, setCompany] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [formMessageColor, setFormMessageColor] = useState('');

    useEffect(() => {
        if (validateEmail(email) && name.length > 0 && message.length > 0) {
            setIsFormValid(true);
        } else {
            setIsFormValid(false);
        }
    }, [email, name, message]);

    const handleSubmit = useCallback(() => {
        if (isFormValid) {
            setIsLoading(true);
            const form = document.getElementById('contactForm') as HTMLFormElement;
            form.submit();
        } else {
            setFormMessage('Form unable to validate, please try again.');
            setFormMessageColor(colors.red);
        }
    }, [isFormValid]);

    useEffect(() => {
        if (formMessage.length > 0) {
            setTimeout(() => {
                setFormMessage('');
                setFormMessageColor('');
            }, 4000);
        }
    }, [formMessage]);

    return (
        <div className="site-page-content">
            <div style={styles.header}>
                <h1>Contact</h1>
                <div style={styles.socials}>
                    <SocialBox
                        icon={ghIcon}
                        link={'https://github.com/QC20#bottom'}
                    />
                    <SocialBox
                        icon={inIcon}
                        link={'https://www.linkedin.com/in/jonas-kjeldmand/'}
                    />
                    <SocialBox
                        icon={hdIcon}
                        link={'https://hackaday.io/projects/hacker/1352435'}
                    />
                </div>
            </div>
            <p>
            If I have managed to spark your attention with this website, and you would like to get in contact {' '}
            you can reach out to me by filling out this form. 
            </p>
            <br />
            <p>
            Alternatively, feel free to send me an <a href="mailto:email@example.com">email directly</a>.
            </p>
            <div className="text-block">
                
                <p>
                    <b>Email: </b>
                    <a href="mailto:jkj@di.ku.dk">
                        jkj@di.ku.dk
                    </a>
                </p>

                <div style={styles.form}>
                    <form id="contactForm" action="https://formspree.io/f/xbjeeeqo" method="POST">
                        <label>
                            <p>
                                {!name && <span style={styles.star}>*</span>}
                                <b>Name:</b>
                            </p>
                        </label>
                        <input
                            style={styles.formItem}
                            type="text"
                            name="name"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <label>
                            <p>
                                {!validateEmail(email) && (
                                    <span style={styles.star}>*</span>
                                )}
                                <b>Email:</b>
                            </p>
                        </label>
                        <input
                            style={styles.formItem}
                            type="email"
                            name="_replyto"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <label>
                            <p>
                                <b>Company (optional):</b>
                            </p>
                        </label>
                        <input
                            style={styles.formItem}
                            type="text"
                            name="company"
                            placeholder="Company Name"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                        />
                        <label>
                            <p>
                                {!message && <span style={styles.star}>*</span>}
                                <b>Message:</b>
                            </p>
                        </label>
                        <textarea
                            name="message"
                            placeholder="Message"
                            style={styles.formItem}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                        <div style={styles.buttons}>
                            <button
                                className="site-button"
                                style={styles.button}
                                type="submit"
                                disabled={!isFormValid || isLoading}
                                onMouseDown={handleSubmit}
                            >
                                {!isLoading ? (
                                    'Send Message'
                                ) : (
                                    <p className="loading">Sending...</p>
                                )}
                            </button>
                            <div style={styles.formInfo}>
                                <p
                                    style={Object.assign(
                                        {},
                                        { color: formMessageColor }
                                    )}
                                >
                                    <b>
                                        <sub>
                                            {formMessage
                                                ? `${formMessage}`
                                                : 'All messages are sent to my personal email.'}
                                        </sub>
                                    </b>
                                </p>
                                <p>
                                    <sub>
                                        {!isFormValid ? (
                                            <span>
                                                <b style={styles.star}>*</b> =
                                                required
                                            </span>
                                        ) : (
                                            '\xa0'
                                        )}
                                    </sub>
                                </p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <ResumeDownload altText="Do you need a copy of my CV ?" />
        </div>
    );
};

const styles: StyleSheetCSS = {
    form: {
        flexDirection: 'column',
        marginTop: 32,
    },
    formItem: {
        marginTop: 4,
        marginBottom: 16,
    },
    socialImage: {
        width: 36,
        height: 36,
    },
    buttons: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    formInfo: {
        textAlign: 'right',

        flexDirection: 'column',
        alignItems: 'flex-end',
        paddingLeft: 24,
    },
    star: {
        paddingRight: 4,
        color: 'red',
    },
    button: {
        minWidth: 184,
        height: 32,
    },
    header: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    socials: {
        marginBottom: 16,
        justifyContent: 'flex-end',
    },
    social: {
        width: 4,
        height: 4,
        // borderRadius: 1000,

        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
};

export default Contact;
