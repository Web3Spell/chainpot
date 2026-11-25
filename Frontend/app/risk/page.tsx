'use client';

import Link from 'next/link';
import { LegalShell, type LegalSection } from '@/components/legal/legal-shell';

const sections: LegalSection[] = [
  {
    id: 'members',
    title: 'Other members may stop paying',
    body: (
      <>
        <p>
          This is the biggest risk in any savings circle. Every member depends on every other member paying every round.
        </p>
        <ul>
          <li>
            <strong>A member who has already received the pot can stop paying and keep it.</strong> No collateral is
            taken, and neither ChainPot nor the smart contracts can force anyone to pay.
          </li>
          <li>When someone defaults, later pots are smaller, so members who receive later may get back less than they paid in.</li>
          <li>ChainPot will not compensate you for, or recover money from, a member who defaults or acts dishonestly.</li>
        </ul>
        <p>Only join circles with people you know and trust, and never contribute money you cannot afford to lose.</p>
      </>
    ),
  },
  {
    id: 'you-miss',
    title: 'If you miss a payment, you lose your place',
    body: (
      <ul>
        <li>There is no grace period after the payment window closes, and the rule is applied automatically.</li>
        <li>Your earlier contributions are not refunded, and you cannot rejoin that circle.</li>
        <li>Reminders and autopay are conveniences. Messages can be delayed or not delivered, and autopay can fail (for example if your balance is too low). Paying on time is your responsibility.</li>
      </ul>
    ),
  },
  {
    id: 'contracts',
    title: 'Smart contract risk',
    body: (
      <p>
        The ChainPot contracts have been audited by Certora, but audits reduce risk and do not remove it. Contracts can
        contain undiscovered bugs or be exploited, which could lead to the loss of some or all funds in them.
        Transactions on a blockchain are final and cannot be reversed.
      </p>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-party protocol risk',
    body: (
      <ul>
        <li><strong>Base</strong> can be congested, halted, reorganised or forked.</li>
        <li><strong>USDC</strong> is issued by Circle. It can lose its peg to the US dollar, and its issuer can freeze addresses.</li>
        <li><strong>Compound</strong>, where waiting money earns interest, can suffer bugs, attacks, bad debt or withdrawal limits that delay or reduce what the vault gets back.</li>
        <li><strong>Chainlink</strong> randomness can be delayed; after a long outage a fallback random source is used.</li>
        <li><strong>Privy</strong> (sign-in) and <strong>Coinbase Developer Platform</strong> (gas sponsorship) can have outages that stop you using the app for a while.</li>
      </ul>
    ),
  },
  {
    id: 'account',
    title: 'Account and security risk',
    body: (
      <p>
        Your smart account is controlled through your login methods. If someone takes over your phone number, email,
        Google or Apple account, or passkey device, they may be able to move your funds. Watch out for phishing: ChainPot
        will never ask for your login codes or passwords.
      </p>
    ),
  },
  {
    id: 'interest',
    title: 'Interest is not guaranteed',
    body: (
      <p>
        Interest is variable, can be zero, and depends on Compound. It is not a promised return. 20% of interest earned
        goes to the ChainPot treasury.
      </p>
    ),
  },
  {
    id: 'admin',
    title: 'Administrative and pause risk',
    body: (
      <p>
        An administrator can pause the contracts in an emergency, which may delay rounds and payouts, and can authorise
        new engine contracts after a public 2-day delay. See section 12 of the <Link href="/terms">Terms</Link>.
      </p>
    ),
  },
  {
    id: 'currency',
    title: 'Currency and price risk',
    body: (
      <p>
        Circles are denominated in USDC (digital US dollars). Amounts shown in your local currency are estimates based
        on third-party exchange rates and will differ from what you pay or receive when converting through an on-ramp,
        bank or exchange. Exchange rates move.
      </p>
    ),
  },
  {
    id: 'legal',
    title: 'Legal, regulatory and tax risk',
    body: (
      <p>
        Laws on savings circles, chit funds, digital assets and payments differ between countries and change often. A
        change in law, or a regulator&apos;s decision, could limit or end ChainPot in your country, or make some uses
        unlawful. You are responsible for complying with your local laws and for your taxes.
      </p>
    ),
  },
  {
    id: 'beta',
    title: 'Beta and testnet',
    body: (
      <p>
        ChainPot is in beta. Features may change or stop working. Testnet tokens have no value and testnet data may be
        reset at any time.
      </p>
    ),
  },
];

export default function RiskPage() {
  return (
    <LegalShell
      title="Risk Disclosure"
      intro={
        <p>
          Saving in a circle on ChainPot can lead to losing some or all of the money you put in. Read these risks before
          you join or start a circle. They form part of our <Link href="/terms" className="font-semibold text-cp-accent">Terms of Service</Link>.
        </p>
      }
      sections={sections}
    />
  );
}
