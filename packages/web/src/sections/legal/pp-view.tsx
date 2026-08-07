import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown from 'react-markdown';
import { SimpleLayout } from '@/layouts/simple';

const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '24px 0' }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', lineHeight: 1.6 }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      style={{
        padding: '10px 16px',
        textAlign: 'left',
        fontWeight: 600,
        border: '1px solid rgba(0,0,0,0.12)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{ padding: '12px 16px', border: '1px solid rgba(0,0,0,0.12)', verticalAlign: 'top' }}
    >
      {children}
    </td>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc' }}>{children}</ul>
  ),
  li: ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>,
  h1: ({ children }) => (
    <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 32, marginBottom: 8, color: '#666' }}
    >
      {children}
    </h2>
  ),
  p: ({ children }) => <p style={{ marginBottom: 12, lineHeight: 1.7 }}>{children}</p>,
};

export default function PrivacyPolicyView() {
  return (
    <SimpleLayout
      slotProps={{
        content: {
          compact: true,
          sx: {
            textAlign: 'left',
            maxWidth: 900,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          },
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {MESSAGE}
      </ReactMarkdown>
    </SimpleLayout>
  );
}

const MESSAGE = `# NORMAL PROTOCOL PRIVACY POLICY

Last Updated: May 06, 2026

One of the main priorities of Normal Finance, Inc. ("Normal") and its affiliates (together, "we", "us" or "the Company") is the privacy of our visitors. This Privacy Policy documents the types of information that we collect and record and how we use it.

If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.

This Privacy Policy applies only to our online activities and to the information that visitors to our websites share with and/or we collect. This policy is not applicable to any information collected offline or via channels other than our websites.

## I. Consent

By using our website, you hereby consent to our Privacy Policy and agree to its terms.

## II. Personal Data We Collect and Disclose

The below table describes what personal data that we collect about you and to whom we disclose personal data.

| Category of Data Collected | Disclosure of Data |
| --- | --- |
| Identifiers, such as your name, email address, address, phone number, and device identifiers (e.g., advertising identifiers and IP address). | <ul><li>Affiliates and subsidiaries of the Company, which includes parent and ultimate holding companies, affiliates, subsidiaries, and business units</li><li>Service providers, such as security and platform vendors</li><li>With third parties that are necessary to complete a transaction</li><li>Business partners whom we partner with to jointly market or sell our products and services, such as channel partners</li><li>Professional advisors, such as lawyers, accountants, and auditors</li><li>Entities involved in a corporate transaction, including if we sell, acquire, or merge all or some of our assets</li><li>Companies that operate cookies and tracking technologies, such as marketing and advertising partners</li><li>To which you have consented to the disclosure</li></ul> |
| Internet or other electronic network activity information and device information, such as your browsing history, search history, device information, and other information (whether passive browsing or active engagement) regarding your interactions with our website and use of our products and services. | <ul><li>Affiliates and subsidiaries of the Company, which includes parent and ultimate holding companies, affiliates, subsidiaries, and business units</li><li>Service providers, such as security and platform vendors</li><li>Companies that operate cookies and tracking technologies, such as marketing and advertising partners</li><li>Entities involved in a corporate transaction, including if we sell, acquire, or merge all or some of our assets</li></ul> |
| Geolocation information, such as approximate location based on your IP address, mobile device location, or information you provide to us (such as city and state you provide through a webform). You may be able to control collection of this data through the settings of your device. | <ul><li>Affiliates and subsidiaries of the Company, which includes parent and ultimate holding companies, affiliates, subsidiaries, and business units</li><li>Service providers, such as security and platform vendors</li><li>Entities involved in a corporate transaction, including if we sell, acquire, or merge all or some of our assets</li><li>Companies that operate cookies and tracking technologies, such as marketing and advertising partners</li></ul> |

In addition to the above disclosures, we may share your personal data to respond to lawful requests by law enforcement or other government authorities. We may also de-identify, anonymize, or aggregate personal data to use or share with third parties for any purpose, where legally permitted.

## III. How We Use Your Personal Data

The information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.

We process personal data for the following purposes:

- To make our services available to you where such information is required;
- Provide, operate, and maintain our websites;
- Improve, personalize, and expand our websites;
- Understand and analyze how you use our websites;
- Develop new products, services, features, and functionalities;
- Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to our websites, and for marketing and promotional purposes;
- For our own business purposes, such as maintaining our business records and administering our technologies and network;
- For legal, safety, or security reasons, including to comply with legal requirements; investigate any content or conduct policy violations; and detect, prevent, and respond to security incidents or other malicious, deceptive, fraudulent, or illegal activity;
- When you have agreed to have your personal data processed by us.

## IV. Communications

We communicate with users to operate the platform, maintain security, and share updates about Normal. This section describes the types of communications you may receive and your control over them.

**Transactional Communications** We send transactional emails and notifications related to your account and activity on the platform. These communications may include confirmations for deposits and withdrawals, security alerts, password resets, account verification messages, and other notifications necessary to operate the service. These communications are essential to your use of our platform and are sent regardless of your marketing preferences.

**Marketing Communications** We send marketing emails and product updates only to users who have explicitly opted in to receive them. You may opt in through signup forms, account settings, or other subscription entry points across the platform. Marketing communications may include information about new features, product announcements, educational content, and promotional offers. You can unsubscribe from marketing emails at any time by using the unsubscribe link provided in any marketing email or by updating your communication preferences in your account settings.

**Consent Management** We record and manage your consent for marketing communications in accordance with applicable data protection laws. You maintain full control over your communication preferences and can update them at any time through your account settings or by using the preference management tools provided in our emails.

**Third-Party Service Providers** We use third-party email service providers to manage, deliver, and track our communications. These providers process your information solely on our behalf and in accordance with our instructions, applicable data protection standards, and contractual obligations that protect your privacy.

**Activity-Based Communications** We may use information about your interactions with the platform, including account activity, transaction history, and engagement patterns, to send relevant communications. These may include transaction summaries, periodic account reviews, feature recommendations based on your usage, and other product-related updates designed to improve your experience with Normal. Where these communications are promotional in nature, they are subject to your marketing preferences.

## V. Log Files

We follow a standard procedure of using log files. These files log visitors when they visit websites. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering our websites, tracking users' movement on our websites, and gathering demographic information.

## VI. Cookies and Web Beacons

Like other websites, we use "cookies." These cookies are used to store information including visitors' preferences, and the pages on the websites that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.

You can choose to disable cookies through your individual browser options. More detailed information about cookie management with specific web browsers can be found at the browsers' respective websites.

## VII. Advertising Partners Privacy Policies

Third-party ad servers or ad networks use technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on our websites, which are sent directly to the user's browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.

We have no access to or control over these cookies that are used by third-party advertisers.

## VIII. Third Party Privacy Policies

This Privacy Policy does not apply to other advertisers or websites. You should consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.

## IX. Supplemental Terms for California Residents

Under the California Consumer Privacy Act ("CCPA"), California consumers have the following rights:

**Right to know** – You have the right to request that we disclose the categories of personal data that we have collected about you, the categories of sources of that personal data, the purposes for collecting the personal data, the categories of third parties to whom we have disclosed your personal data, and the purpose for which we disclosed your personal data. You may also request information about the specific pieces of personal data we have collected about you.

**Right to delete** – You have the right to request that we delete any personal data about you that we have collected.

**Right to correct** – You have the right to request that we correct any inaccurate personal information that we maintain about you.

**Right to opt out of sale or sharing** – You have the right to request that we not sell or share your personal data.

If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us at the address provided below.

## X. Supplemental Terms for the European Economic Area, Switzerland, and the U.K

Under the General Data Protection Regulations ("GDPR"), every user is entitled to the following:

**The right to be informed** – You have the right to know how we will collect, process and store your data, and for what purposes.

**The right to access** – You have the right to request copies of your personal data. We may charge you a small fee for this service.

**The right to rectification** – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.

**The right to erasure** – You have the right to request that we erase your personal data, under certain conditions.

**The right to restrict processing** – You have the right to request that we restrict the processing of your personal data, under certain conditions.

**The right to object** – You have the right to object to our processing of your personal data, under certain conditions.

**The right to data portability** – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.

**The right to avoid automated decision-making** – You have the right to demand human intervention for decision-making.

If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us at the address provided below.

## XI. Children's Privacy

Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their children's online activity.

We do not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child has provided this kind of information to our websites, we strongly encourage you to contact us immediately at the contact address provided below.

## XII. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We advise you to review this page periodically for any changes. We will notify you of any changes by posting the new Privacy Policy on this page. These changes are effective immediately after they are posted on this page.

Contact us: hello@normalfinance.io`;
