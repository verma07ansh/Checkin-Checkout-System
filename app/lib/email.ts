import emailjs from '@emailjs/browser';
import { Event, EventUser } from '../types';
import { formatTime } from './utils';

// These should be set in .env.local
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_id_placeholder';
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_id_placeholder';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'public_key_placeholder';

export const sendPassEmail = async (event: Event, user: EventUser) => {
    try {
        const verificationLink = `${window.location.origin}/verify-pass?token=${user.verificationToken}&eventId=${event.id}`;

        const templateParams = {
            to_name: user.name,
            to_email: user.email,
            event_name: event.name,
            event_date: `${new Date(event.date).toLocaleDateString('en-GB')}${event.time ? ` at ${formatTime(event.time)}` : ''}`,
            verification_link: verificationLink,
            reply_to: 'admin@event.com',
        };

        const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        return result;
    } catch (error) {
        console.error("EmailJS Error", error);
        throw error;
    }
};
