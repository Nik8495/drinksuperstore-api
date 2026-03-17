import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';

export const submitContactForm = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ message: 'Name, email, subject, and message are required.' });
      return;
    }

    // Store the contact message in the database
    const { error } = await supabase.from('contact_messages').insert([
      {
        name,
        email,
        phone: phone || null,
        subject,
        message,
      },
    ]);

    if (error) {
      console.error('Error saving contact message:', error);
      res.status(500).json({ message: 'Failed to submit your message.' });
      return;
    }

    res.status(200).json({ message: 'Message received successfully.' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
