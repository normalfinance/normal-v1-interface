'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
} from '@mui/material';
import Link from 'next/link';

type CustomButtonProps = {
  title: string;
  variant?: 'text' | 'outlined' | 'contained';
};

type Props = {
  tagline: string;
  heading: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  button: CustomButtonProps;
};

export type ContactFormProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

/* -------------------------------------------------------------------------- */
/*                               Default Props                                */
/* -------------------------------------------------------------------------- */

export const ContactFormDefaults: Props = {
  tagline: 'Tagline',
  heading: 'Contact us',
  description:
    'Have a question, idea, or partnership in mind? We’d love to hear from you. Drop us a message anytime and the Normal Finance team will get back to you within one business day.',
  email: 'hello@relume.io',
  phone: '+1 (555) 000-0000',
  address: '123 Sample St, Sydney NSW 2000 AU',
  button: { title: 'Submit', variant: 'contained' },
};

/* -------------------------------------------------------------------------- */
/*                               ContactForm                                   */
/* -------------------------------------------------------------------------- */

export const ContactForm: React.FC<ContactFormProps> = (props) => {
  const { tagline, heading, description, email, phone, address, button, ...sectionProps } = {
    ...ContactFormDefaults,
    ...props,
  };

  const [nameInput, setNameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [messageInput, setMessageInput] = useState<string>('');
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log({ nameInput, emailInput, messageInput, acceptTerms });
  };

  return (
    <Box
      component="section"
      {...sectionProps}
      py={{ xs: 8, md: 12, lg: 14 }}
      sx={{ backgroundColor: '#F9FAFB' }}
    >
      <Container>
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="flex-start">
          <Grid item xs={12} md={6}>
            <Box mb={{ xs: 3, md: 4 }}>
              <Typography
                component="h2"
                sx={{
                  fontWeight: 500,
                  fontSize: {
                    xs: '2rem',
                    md: '3rem',
                    lg: '4rem',
                  },
                  mb: 2,
                }}
              >
                {heading}
              </Typography>
              <Typography variant="body1">{description}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box component="form" onSubmit={handleSubmit} display="grid" gap={3}>
              <TextField
                label="Name"
                id="name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                fullWidth
                sx={{ backgroundColor: '#eceff0', borderRadius: 1 }}
              />
              <TextField
                label="Email"
                id="email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                fullWidth
                sx={{ backgroundColor: '#eceff0', borderRadius: 1 }}
              />
              <TextField
                label="Message"
                id="message"
                multiline
                minRows={5}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                fullWidth
                sx={{ backgroundColor: '#eceff0', borderRadius: 1 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    id="terms"
                  />
                }
                label={
                  <Typography variant="body2">
                    I accept the <Link href="#">Terms of Service</Link>
                  </Typography>
                }
              />
              <Button type="submit" variant={button.variant ?? 'contained'}>
                {button.title}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ContactForm;
