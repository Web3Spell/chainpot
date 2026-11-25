'use client';

import { LegalShell, type LegalSection } from '@/components/legal/legal-shell';
import { LEGAL } from '@/lib/legal';

const sections: LegalSection[] = [
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <ul>
        <li><strong>Sign-in details</strong> from Privy: your phone number, email address or social account identifier, and your Privy user ID.</li>
        <li><strong>Wallet details</strong>: your smart account address and the addresses of your embedded signer.</li>
        <li><strong>Profile settings</strong>: country, currency, optional display name, and reminder preferences and channels.</li>
        <li><strong>Circle data</strong>: draft circles you create or join, invite links, seat lists and circle names.</li>
        <li><strong>Records of your consent</strong>: which version of these documents you accepted, when, and from which browser (user agent).</li>
        <li><strong>Technical data</strong>: server logs such as IP address, device and browser type and request times, used for security and rate limiting.</li>
      </ul>
    ),
  },
  {
    id: 'onchain',
    title: 'Public blockchain data',
    body: (
      <p>
        Every payment, bid, draw and payout is recorded on the Base blockchain together with your account address. That
        record is <strong>public, permanent and outside our control</strong>; we cannot change or delete it. Anyone who
        links your address to you can see your circle activity.
      </p>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <ul>
        <li>to sign you in, run your account and sponsor your transactions;</li>
        <li>to show amounts in your currency and send the payment reminders you turned on;</li>
        <li>to manage invites and circles you create or join;</li>
        <li>to prevent fraud, abuse and spam, enforce our Terms and keep the service secure;</li>
        <li>to keep proof that you accepted our Terms; and</li>
        <li>to comply with law and respond to valid legal requests.</li>
      </ul>
    ),
  },
  {
    id: 'share',
    title: 'Who we share it with',
    body: (
      <>
        <p>We do not sell your personal data. We share it only with service providers that help us run ChainPot:</p>
        <ul>
          <li>Privy (sign-in and embedded wallets);</li>
          <li>Coinbase Developer Platform (transaction bundling and gas sponsorship);</li>
          <li>Supabase (database) and Vercel (hosting);</li>
          <li>Resend and Twilio (email, SMS and WhatsApp reminders, if you turn them on); and</li>
          <li>Transak, only if you choose to buy USDC through it.</li>
        </ul>
        <p>
          We may also disclose data when the law requires it, to protect people&apos;s safety or rights, to investigate
          fraud, or as part of a merger or sale of the business.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <p>
        We keep account data while your account is active and for as long as needed for the purposes above, including
        legal, security and dispute purposes. Consent records are kept for as long as they may be needed as evidence. We
        delete or anonymise data we no longer need.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    body: (
      <>
        <p>
          You can change your profile and reminder settings in the app at any time. Depending on where you live, you may
          have the right to access, correct, delete or export your personal data, or to object to or restrict how we use
          it. Contact us at <a href={LEGAL.contactUrl} target="_blank" rel="noreferrer">{LEGAL.contactLabel}</a>.
        </p>
        <p>We cannot delete or change data recorded on the blockchain.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security and transfers',
    body: (
      <p>
        We use access controls, encryption in transit and row-level database security to protect your data, but no system
        is perfectly secure. Our providers may process data in other countries; where required, we rely on appropriate
        safeguards for those transfers.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>ChainPot is only for people aged 18 or over. We do not knowingly collect data from children.</p>,
  },
  {
    id: 'storage',
    title: 'Cookies and local storage',
    body: (
      <p>
        We use your browser&apos;s storage and essential cookies to keep you signed in and remember your theme, country,
        intro and acceptance of these documents. We do not use advertising cookies.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: (
      <p>
        We will update this policy when our practices change and ask you to accept material changes. Questions or
        requests: <a href={LEGAL.contactUrl} target="_blank" rel="noreferrer">{LEGAL.contactLabel}</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      intro={
        <p>
          How {LEGAL.operator} collects, uses and protects your information when you use ChainPot. Remember that what you
          do on-chain is public by design.
        </p>
      }
      sections={sections}
    />
  );
}
