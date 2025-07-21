import React from 'react';

import { FaqAccordion } from '../landing-page/faq';
import ContactForm from '@/components/_contact/contact-form';

const ContactView: React.FC = () => {
  return (
    <>
      <ContactForm />
      <FaqAccordion />
    </>
  );
};

export default ContactView;
