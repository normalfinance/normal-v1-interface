import React from 'react';

import ContactForm from '@/components/_contact/contact-form';

import { FaqAccordion } from '../landing-page/faq';

const ContactView: React.FC = () => (
    <>
      <ContactForm />
      <FaqAccordion />
    </>
  );

export default ContactView;
