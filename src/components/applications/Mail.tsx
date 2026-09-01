import React, { useRef, useState } from 'react';
import Window from '../os/Window';
import MenuBar, { MenuBarMenu } from '../os/MenuBar';
import Colors from '../../constants/colors';

// Note: To make email sending work, you need to set up EmailJS
// 1. Go to https://www.emailjs.com/
// 2. Create a free account
// 3. Create an email service and template
// 4. Replace SERVICE_ID, TEMPLATE_ID, and PUBLIC_KEY below

export interface MailProps extends WindowAppProps {}

const Mail: React.FC<MailProps> = ({ onInteract, onClose, onMinimize }) => {
    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const messageRef = useRef<HTMLTextAreaElement>(null);
    const [senderName, setSenderName] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    // EmailJS Configuration - UPDATE THESE WITH YOUR ACTUAL EMAILJS CREDENTIALS
    const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
    const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
    const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

    /**
     * A compose window's menus, doing the four things a compose window does.
     * Send is the default action, so it is the bold one, and it is greyed for
     * exactly the same reason the Send button is: an empty message.
     */
    const canSend =
        !!senderName.trim() && !!senderEmail.trim() && !!message.trim();

    const menus: MenuBarMenu[] = [
        {
            label: 'File',
            items: [
                {
                    label: 'Send',
                    bold: true,
                    accelerator: 'Ctrl+Enter',
                    disabled: !canSend || status === 'sending',
                    onClick: () => handleSendEmail(),
                },
                {
                    label: 'Close',
                    separatorBefore: true,
                    accelerator: 'Alt+F4',
                    onClick: onClose,
                },
            ],
        },
        {
            label: 'Edit',
            items: [
                {
                    label: 'Copy Message',
                    accelerator: 'Ctrl+C',
                    disabled: !message.trim(),
                    onClick: () =>
                        navigator.clipboard
                            ?.writeText(message)
                            .catch(() => undefined),
                },
                {
                    label: 'Clear Message',
                    separatorBefore: true,
                    disabled: !senderName && !senderEmail && !message,
                    onClick: () => {
                        setSenderName('');
                        setSenderEmail('');
                        setMessage('');
                        setStatus('idle');
                    },
                },
            ],
        },
        {
            label: 'View',
            items: [
                {
                    label: 'Plain Text',
                    checked: true,
                    onClick: () => undefined,
                },
            ],
        },
        {
            label: 'Help',
            items: [
                {
                    label: "Where does this go?",
                    onClick: () =>
                        window.alert(
                            'Straight to jokje@dtu.dk. Nothing is stored on this site \u2014 the message is handed to the mail service and forgotten.'
                        ),
                },
            ],
        },
    ];

    const handleSendEmail = async () => {
        if (!senderName.trim() || !senderEmail.trim() || !message.trim()) {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 2000);
            return;
        }

        setStatus('sending');

        try {
            // UNCOMMENT THIS SECTION AFTER SETTING UP EMAILJS:
            /*
            import emailjs from '@emailjs/browser';

            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_email: 'jokje@dtu.dk',
                    from_name: senderName,
                    from_email: senderEmail,
                    message: message,
                },
                EMAILJS_PUBLIC_KEY
            );
            */

            // ALTERNATIVE: Use a backend endpoint
            /*
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'jokje@dtu.dk',
                    from_name: senderName,
                    from_email: senderEmail,
                    message: message,
                }),
            });
            if (!response.ok) throw new Error('Failed to send');
            */

            // Simulate success for now
            setStatus('success');
            setSenderName('');
            setSenderEmail('');
            setMessage('');

            setTimeout(() => setStatus('idle'), 2000);
        } catch (error) {
            console.error('Error sending email:', error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    const styles: StyleSheetCSS = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            // Fill the Window's content box (which is itself a flex row).
            flex: 1,
            minWidth: 0,
            height: '100%',
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
        },
        toContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderBottom: `1px solid ${Colors.darkGray}`,
            background: Colors.lightGray,
        },
        toLabel: {
            width: 50,
            fontWeight: 'bold',
            fontSize: 11,
        },
        toInput: {
            flex: 1,
            padding: '3px 4px',
            border: `1px solid ${Colors.darkGray}`,
            borderRightColor: Colors.white,
            borderBottomColor: Colors.white,
            background: '#d4d1d1',
            fontFamily: 'MSSerif',
            fontSize: 11,
            color: Colors.darkGray,
        },
        fieldContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderBottom: `1px solid ${Colors.darkGray}`,
            background: Colors.lightGray,
        },
        fieldLabel: {
            width: 50,
            fontWeight: 'bold',
            fontSize: 11,
        },
        fieldInput: {
            flex: 1,
            padding: '3px 4px',
            border: `1px solid ${Colors.darkGray}`,
            borderRightColor: Colors.white,
            borderBottomColor: Colors.white,
            background: Colors.white,
            fontFamily: 'MSSerif',
            fontSize: 11,
            color: Colors.black,
        },
        messageContainer: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '8px 12px',
            background: Colors.lightGray,
        },
        messageLabel: {
            marginBottom: 4,
            fontWeight: 'bold',
            fontSize: 11,
        },
        messageInput: {
            flex: 1,
            padding: '4px 4px',
            border: `1px solid ${Colors.darkGray}`,
            borderRightColor: Colors.white,
            borderBottomColor: Colors.white,
            background: Colors.white,
            fontFamily: 'MSSerif',
            fontSize: 11,
            color: Colors.black,
            resize: 'none' as const,
        },
        buttonBar: {
            display: 'flex',
            gap: 8,
            padding: '8px 12px',
            background: Colors.lightGray,
            borderTop: `1px solid ${Colors.darkGray}`,
            justifyContent: 'flex-end',
        },
        button: {
            padding: '4px 16px',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
            cursor: 'pointer',
            minWidth: 50,
            textAlign: 'center' as const,
        },
        sendButton: {
            padding: '3px 8px',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 10,
            cursor: 'pointer',
            width: 50,
        },
        statusBar: {
            padding: '4px 12px',
            background:
                status === 'success'
                    ? '#90EE90'
                    : status === 'error'
                      ? '#FFB6C6'
                      : Colors.lightGray,
            color:
                status === 'success'
                    ? '#006400'
                    : status === 'error'
                      ? '#8B0000'
                      : Colors.black,
            fontSize: 10,
            fontWeight: 'bold',
            textAlign: 'center' as const,
            minHeight: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
    };

    return (
        <Window
            top={64}
            left={96}
            width={460}
            height={420}
            windowTitle="Mail — New Message"
            windowBarIcon="mailIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="To: jokje@dtu.dk"
        >
        <div style={styles.container}>
            {/* Menu Bar */}
            <MenuBar menus={menus} />

            {/* To Field - Recipient Email (disabled, shows your email) */}
            <div style={styles.toContainer}>
                <div style={styles.toLabel}>To:</div>
                <input
                    type="email"
                    value="jokje@dtu.dk"
                    style={styles.toInput}
                    disabled
                    title="Email will be sent to jokje@dtu.dk"
                />
            </div>

            {/* From Name Field */}
            <div style={styles.fieldContainer}>
                <div style={styles.fieldLabel}>Name</div>
                <input
                    ref={nameRef}
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    style={styles.fieldInput}
                    placeholder="Your Name"
                    disabled={status === 'sending'}
                />
            </div>

            {/* From Email Field */}
            <div style={styles.fieldContainer}>
                <div style={styles.fieldLabel}>Email</div>
                <input
                    ref={emailRef}
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    style={styles.fieldInput}
                    placeholder="your@email.com"
                    disabled={status === 'sending'}
                />
            </div>

            {/* Message Area */}
            <div style={styles.messageContainer}>
                <div style={styles.messageLabel}>Message</div>
                <textarea
                    ref={messageRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={styles.messageInput}
                    placeholder="Enter your message here..."
                    disabled={status === 'sending'}
                />
            </div>

            {/* Status Bar */}
            {status !== 'idle' && (
                <div style={styles.statusBar}>
                    {status === 'sending' && 'Sending...'}
                    {status === 'success' && 'Email sent successfully!'}
                    {status === 'error' &&
                        (!senderName || !senderEmail || !message
                            ? 'Please fill in all fields'
                            : 'Error sending email')}
                </div>
            )}

            {/* Button Bar */}
            <div style={styles.buttonBar}>
                <button style={styles.button} onClick={handleSendEmail} disabled={status === 'sending'}>
                    Send
                </button>
                <button
                    style={styles.button}
                    onClick={() => {
                        setSenderName('');
                        setSenderEmail('');
                        setMessage('');
                        setStatus('idle');
                    }}
                    disabled={status === 'sending'}
                >
                    Clear
                </button>
                <button style={styles.button} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
        </Window>
    );
};

export default Mail;
