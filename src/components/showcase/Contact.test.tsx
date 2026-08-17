import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Contact from './Contact';

/**
 * Regression guard for the bug fixed here: the form used to call the raw DOM
 * `form.submit()`, which POSTs the browser's actual tab to Formspree and
 * navigates the visitor off the site — jsdom can't observe a real navigation,
 * but it can observe *how* the submission happens. If a future edit brings
 * back `form.submit()` (or an `action`/`method` pair that lets the browser
 * handle it), `fetch` stops being called and this test fails.
 */
describe('Contact form', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    const fillValidForm = () => {
        fireEvent.change(screen.getByPlaceholderText('Name'), {
            target: { value: 'Ada Lovelace' },
        });
        fireEvent.change(screen.getByPlaceholderText('Email'), {
            target: { value: 'ada@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Message'), {
            target: { value: 'Hello!' },
        });
    };

    it('submits via fetch to the Formspree AJAX endpoint, not a native form POST', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
        render(<Contact />);

        fillValidForm();
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
        expect(url).toBe('https://formspree.io/f/xbjeeeqo');
        expect(init.method).toBe('POST');
        expect(init.body).toBeInstanceOf(FormData);
    });

    it('shows a success message and clears the form once Formspree accepts it', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
        render(<Contact />);

        fillValidForm();
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        expect(
            await screen.findByText(/message sent/i)
        ).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Name')).toHaveValue('');
        expect(screen.getByPlaceholderText('Message')).toHaveValue('');
    });

    it('shows an error message without clearing the form when Formspree rejects it', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
        render(<Contact />);

        fillValidForm();
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        expect(
            await screen.findByText(/something went wrong/i)
        ).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Name')).toHaveValue('Ada Lovelace');
    });

    it('never calls fetch while the form is invalid', () => {
        render(<Contact />);
        const button = screen.getByRole('button', { name: /send message/i });
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('links "email directly" to the real address, not a placeholder', () => {
        render(<Contact />);
        expect(screen.getByText('email directly')).toHaveAttribute(
            'href',
            'mailto:jkj@di.ku.dk'
        );
    });
});
