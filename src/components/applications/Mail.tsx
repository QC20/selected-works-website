import React, { useRef, useState } from 'react';
import { Icon } from '../general';
import Colors from '../../constants/colors';

// Note: To make email sending work, you need to set up EmailJS
// 1. Go to https://www.emailjs.com/
// 2. Create a free account
// 3. Create an email service
// 4. Create an email template
// 5. Replace SERVICE_ID, TEMPLATE_ID, and PUBLIC_KEY below

// For now, this component shows a functional email form that validates input
// To enable actual sending, uncomment emailjs import and sendEmail implementation

export interface MailProps {
    onInteract?: () => void;
    onClose?: () => void;
    onMinimize?: () => void;
}

const Mail: React.FC<MailProps> = ({ onInteract, onClose, onMinimize }) => {
    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const messageRef = useRef<HTMLTextAreaElement>(null);
    const [senderName, setSenderName] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    // EmailJS Configuration - UPDATE THESE WITH YOUR ACTUAL EMAILJS CREDENTIALS
    const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // Replace with your EmailJS service ID
    const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // Replace with your EmailJS template ID
    const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Replace with your EmailJS public key

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!senderName.trim() || !senderEmail.trim() || !message.trim()) {
            setStatus('error');
            return;
        }

        setStatus('sending');

        try {
            // Option 1: Using EmailJS (uncomment if you set up EmailJS)
            /*
            const emailjs = require('@emailjs/browser');

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

            // Option 2: Using a backend service or fetch API
            // Uncomment and modify if you have a backend endpoint
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

            // For now, we'll simulate success
            setStatus('success');
            setSenderName('');
            setSenderEmail('');
            setMessage('');

            // Reset after 3 seconds
            setTimeout(() => {
                setStatus('idle');
            }, 3000);
        } catch (error) {
            console.error('Error sending email:', error);
            setStatus('error');
            setTimeout(() => {
                setStatus('idle');
            }, 3000);
        }
    };

    const styles: StyleSheetCSS = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 12,
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
            padding: 12,
            borderBottom: `1px solid ${Colors.darkGray}`,
        },
        label: {
            marginBottom: 4,
            fontWeight: 'bold',
            color: Colors.black,
        },
        input: {
            padding: 4,
            border: `1px solid ${Colors.darkGray}`,
            borderRightColor: Colors.white,
            borderBottomColor: Colors.white,
            background: Colors.white,
            fontFamily: 'MSSerif',
            fontSize: 11,
            marginBottom: 8,
        },
        textarea: {
            padding: 4,
            border: `1px solid ${Colors.darkGray}`,
            borderRightColor: Colors.white,
            borderBottomColor: Colors.white,
            background: Colors.white,
            fontFamily: 'MSSerif',
            fontSize: 11,
            minHeight: 120,
            resize: 'vertical' as const,
        },
        buttonGroup: {
            display: 'flex',
            gap: 8,
            padding: 12,
            justifyContent: 'flex-end',
        },
        button: {
            padding: '4px 12px',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
            cursor: 'pointer',
            minWidth: 60,
        },
        disabledButton: {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
        status: {
            padding: 8,
            textAlign: 'center' as const,
            fontWeight: 'bold',
            color: Colors.black,
        },
        successMessage: {
            background: '#90EE90',
            color: '#006400',
        },
        errorMessage: {
            background: '#FFB6C6',
            color: '#8B0000',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.formGroup}>
                <label style={styles.label}>From:</label>
                <input
                    ref={nameRef}
                    type="text"
                    placeholder="Your Name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    style={styles.input}
                    disabled={status === 'sending'}
                />
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Email:</label>
                <input
                    ref={emailRef}
                    type="email"
                    placeholder="your@email.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    style={styles.input}
                    disabled={status === 'sending'}
                />
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Message:</label>
                <textarea
                    ref={messageRef}
                    placeholder="Enter your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={styles.textarea}
                    disabled={status === 'sending'}
                />
            </div>

            {status === 'success' && (
                <div style={{ ...styles.status, ...styles.successMessage }}>
                    Email sent successfully!
                </div>
            )}

            {status === 'error' && (
                <div style={{ ...styles.status, ...styles.errorMessage }}>
                    {!senderName || !senderEmail || !message
                        ? 'Please fill in all fields'
                        : 'Error sending email. Please try again.'}
                </div>
            )}

            <div style={styles.buttonGroup}>
                <button
                    style={{
                        ...styles.button,
                        ...(status === 'sending' ? styles.disabledButton : {}),
                    }}
                    onClick={handleSendEmail}
                    disabled={status === 'sending'}
                >
                    {status === 'sending' ? 'Sending...' : 'Send'}
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
    );
};

export default Mail;
