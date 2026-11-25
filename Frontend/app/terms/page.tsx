'use client';

import Link from 'next/link';
import { LegalShell, type LegalSection } from '@/components/legal/legal-shell';
import { LEGAL, arbitrationSeatText, governingLawText } from '@/lib/legal';

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to these Terms',
    body: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and {LEGAL.operator}{' '}
          (&quot;ChainPot&quot;, &quot;we&quot;, &quot;us&quot;). They govern your use of {LEGAL.site}, the ChainPot
          app, our APIs, reminders and any related service (together, the &quot;Interface&quot;).
        </p>
        <p>
          By ticking the acceptance box, signing in, or using the Interface, you confirm you have read and agree to
          these Terms, the <Link href="/risk">Risk Disclosure</Link> and the <Link href="/privacy">Privacy Policy</Link>,
          which form part of these Terms. If you do not agree, do not use the Interface.
        </p>
        <p>
          <strong>
            These Terms include a limitation of our liability, a waiver of class actions and an agreement to resolve
            disputes by arbitration (sections 19 to 23). Please read them carefully.
          </strong>
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use ChainPot',
    body: (
      <>
        <p>You may use the Interface only if all of the following are true:</p>
        <ul>
          <li>you are at least 18 years old and have full legal capacity to enter into contracts;</li>
          <li>
            you are not a person or entity named on any sanctions list (including those of the UN, the US, the UK, the
            EU and India), and you are not located in, resident in or acting for anyone in a country or region subject
            to comprehensive sanctions;
          </li>
          <li>
            using the Interface, digital assets and rotating savings circles is lawful where you live and where you use
            it; and
          </li>
          <li>you have not previously been barred from the Interface.</li>
        </ul>
        <p>
          You are solely responsible for knowing and following the laws that apply to you, including any law on chit
          funds, savings groups, money circulation schemes, lotteries, foreign exchange, digital assets and tax. We may
          block access from any place where we believe the Interface should not be offered.
        </p>
      </>
    ),
  },
  {
    id: 'what-chainpot-is',
    title: 'What ChainPot is, and what it is not',
    body: (
      <>
        <p>
          ChainPot is <strong>software</strong>. It is an interface that helps people create and take part in rotating
          savings circles (&quot;Circles&quot;) that run on public, open smart contracts on the Base network (the
          &quot;Protocol&quot;). The Protocol&apos;s rules are enforced by code, not by us.
        </p>
        <p>ChainPot is <strong>not</strong>:</p>
        <ul>
          <li>a bank, deposit-taker, lender, credit provider or payment institution;</li>
          <li>a chit fund company, foreman, promoter or manager of any Circle;</li>
          <li>a broker, exchange, money transmitter, custodian or escrow agent;</li>
          <li>an investment, financial, legal or tax adviser; or</li>
          <li>a party to any Circle, or to any agreement or understanding between members of a Circle.</li>
        </ul>
        <p>
          <strong>We never hold your money.</strong> Contributions go directly from your smart account into the
          Protocol&apos;s vault contract, and payouts are claimed directly from that contract. We cannot reverse, cancel,
          redirect or refund any transaction on the blockchain.
        </p>
      </>
    ),
  },
  {
    id: 'beta',
    title: 'Testnet and beta',
    body: (
      <>
        <p>
          ChainPot is in beta. While it runs on Base Sepolia testnet, all tokens used have{' '}
          <strong>no monetary value</strong> and can never be exchanged for real money. Testnet circles, balances and
          history may be reset or lost at any time.
        </p>
        <p>
          When ChainPot runs on Base mainnet, Circles use real USDC. Beta features may change, be limited (for example
          maximum contribution amounts or circle sizes) or be withdrawn at any time.
        </p>
      </>
    ),
  },
  {
    id: 'account',
    title: 'Your account and smart wallet',
    body: (
      <>
        <p>
          When you sign in with a phone number, email, Google, Apple, a passkey or a wallet, our authentication
          provider (Privy) creates or connects an embedded signer, which controls a smart account on Base that is yours.
          Transactions you approve in the Interface are sent from that account.
        </p>
        <ul>
          <li>You are responsible for keeping your login methods (phone, email inbox, social account, passkey device) secure.</li>
          <li>Anyone who gets access to your login methods may be able to move your funds. We cannot recover funds taken this way.</li>
          <li>You must give accurate information and must not create accounts for other people or use multiple accounts to get around limits, penalties or bans.</li>
          <li>Transactions are final once confirmed on-chain.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'circles',
    title: 'How Circles work',
    body: (
      <>
        <p>
          A Circle has a fixed number of members, a fixed contribution per round, a round length, a payment window and,
          for bidding circles, a bidding window. These settings are chosen by the person who creates it (the
          &quot;Organiser&quot;) and are <strong>locked once the Circle starts</strong>.
        </p>
        <ul>
          <li>Each round, every member must pay the full contribution before the payment window closes.</li>
          <li>Each round, one eligible member receives the pot. A member can receive the pot only once per Circle.</li>
          <li>To be eligible in a round you must have paid that round and must not have defaulted.</li>
          <li>A Circle ends when every round has been completed, or earlier when no member who is still eligible to receive remains.</li>
          <li>Joining a Circle is free; you are charged only when you pay a round.</li>
        </ul>
        <p>
          <strong>Organisers.</strong> An Organiser can change the invite list and start the Circle only before it
          starts. After that the Organiser is an ordinary member with no control over payouts or funds. Organisers act
          for themselves, not for ChainPot, and are solely responsible for whom they invite and for anything they
          promise or say to members.
        </p>
        <p>
          <strong>Join and choose your Circles carefully.</strong> Only join Circles with people you know and trust.
          Every member relies on every other member continuing to pay.
        </p>
      </>
    ),
  },
  {
    id: 'defaults',
    title: 'Missed payments, defaults and members who stop paying',
    body: (
      <>
        <p>
          If you do not pay a round before its payment window closes, the Protocol marks you as{' '}
          <strong>defaulted</strong> in that Circle. This happens automatically and cannot be undone by us, the
          Organiser or anyone else. When you default:
        </p>
        <ul>
          <li>you permanently lose your place in that Circle and cannot pay, bid, receive the pot or rejoin it;</li>
          <li>contributions you already made are <strong>not refunded</strong> (they were part of earlier pots already paid to other members);</li>
          <li>you no longer receive any share of interest or bidding discounts from that Circle;</li>
          <li>your ChainPot reputation score is reduced; a second default in any Circle bars you from joining or creating Circles.</li>
        </ul>
        <p>
          The amount the other members pay per round does not change. Rounds after a default simply have a smaller pot,
          because the defaulted member&apos;s share is no longer collected. That share does not go to the Organiser or
          to ChainPot.
        </p>
        <p>
          <strong>
            Members who stop paying after receiving the pot. A member who has already received the pot can stop paying
            and keep what they received. The Protocol does not take collateral, and ChainPot does not guarantee that any
            member will keep paying.
          </strong>{' '}
          You accept that you may receive less than you contributed if other members default.
        </p>
        <p>
          ChainPot has no duty to recover money from, chase, or take action against any member who defaults or behaves
          dishonestly, and is not liable for any loss caused by another member. Any claim you have against another member
          is between you and that member. If you pursue one, we may, where the law allows and on valid legal request,
          provide information we hold, and you may use the public on-chain record of payments.
        </p>
      </>
    ),
  },
  {
    id: 'draws',
    title: 'Draws and bidding',
    body: (
      <>
        <p>
          <strong>Fair draw.</strong> In draw circles the receiver is chosen at random from eligible members using
          Chainlink VRF. If Chainlink fails to respond for an extended period after retries, the Protocol uses a fallback
          on-chain random source so the Circle can continue. You accept the result of any draw as final.
        </p>
        <p>
          <strong>Bidding.</strong> In bidding circles, eligible members may bid the amount they would accept to receive
          the pot early. The lowest valid bid when bidding closes wins and receives that amount; the difference is
          shared among the other members who have not defaulted. <strong>Bids are binding and cannot be withdrawn.</strong>{' '}
          If no valid bid is made, the receiver is chosen by draw.
        </p>
        <p>
          The outcome of a draw or auction is not a prize, wager or lottery winning. Every member receives the pot once
          and pays the same contributions; a draw or auction only sets the order.
        </p>
      </>
    ),
  },
  {
    id: 'interest',
    title: 'Interest',
    body: (
      <>
        <p>
          Contributions waiting in the vault between payment and payout may be supplied to the Compound protocol and
          earn variable interest. Interest is <strong>not guaranteed</strong>, may be zero and depends on a third-party
          protocol. It is not a promised return, and contributions are not deposits or investments.
        </p>
        <p>
          Of any interest earned, 20% goes to the ChainPot treasury (our safety fund) and the rest is shared with
          eligible members as set out in the Protocol. Your contributions themselves are never charged.
        </p>
      </>
    ),
  },
  {
    id: 'fees',
    title: 'Fees and gas',
    body: (
      <>
        <p>
          Using the Interface is currently free. We currently pay network (gas) fees for Circle actions. We may stop or
          limit gas sponsorship, or introduce fees, at any time; any new fee will be shown in the Interface before you
          agree to the action it applies to. Fees charged by third parties (for example card or bank fees when buying
          USDC through an on-ramp) are set by them, not us.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    body: (
      <>
        <p>
          The Interface relies on services we do not control, including the Base network, USDC (issued by Circle),
          Chainlink, Compound, Privy, Coinbase Developer Platform, Transak, exchange-rate providers and messaging
          providers. Your use of them is subject to their own terms. We are not responsible for their availability,
          errors, security, fees, or for USDC losing its peg or being frozen by its issuer.
        </p>
        <p>
          Buying or selling USDC through an on-ramp is a transaction between you and that provider, including any
          identity checks it performs.
        </p>
      </>
    ),
  },
  {
    id: 'admin',
    title: 'Administrative controls in the Protocol',
    body: (
      <>
        <p>To protect users in an emergency, the Protocol&apos;s administrator (a multi-signature wallet) can:</p>
        <ul>
          <li>pause the Protocol, which may delay payments, draws, bids and payouts while paused;</li>
          <li>change the treasury address that receives the 20% interest share;</li>
          <li>
            authorise a new circle-engine contract to use the vault, but only after a public 2-day waiting period that
            anyone can see on-chain; and
          </li>
          <li>after a 2-day delay, recover USDC sent to the vault by mistake that is <strong>not</strong> owed to any member.</li>
        </ul>
        <p>
          The administrator has no function to withdraw members&apos; contributions or balances owed to them directly.
          Balances already credited to you can be withdrawn even while the Protocol is paused. These controls are
          themselves software and carry the risks described in the <Link href="/risk">Risk Disclosure</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'prohibited',
    title: 'Things you must not do',
    body: (
      <>
        <p>You must not use the Interface or the Protocol to:</p>
        <ul>
          <li>join or organise a Circle intending not to pay, or to persuade others to pay while planning to stop after receiving the pot;</li>
          <li>defraud, mislead, threaten or harass any person;</li>
          <li>launder money, finance terrorism, evade sanctions or move proceeds of crime;</li>
          <li>run a chit fund, savings or collective investment business for profit, charge members commissions, or advertise Circles to the public, where doing so requires a licence or registration you do not have;</li>
          <li>promise members returns, guarantees or protections that ChainPot does not provide;</li>
          <li>use bots, fake or multiple accounts, or other people&apos;s identities;</li>
          <li>exploit a bug, interfere with the Interface, the Protocol or other users, or try to get unauthorised access; or</li>
          <li>break any law or anyone else&apos;s rights.</li>
        </ul>
        <p>
          We may report suspected illegal activity to the relevant authorities and co-operate with lawful requests.
        </p>
      </>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension and ending access',
    body: (
      <>
        <p>
          We may restrict, suspend or end your access to the Interface (including reminders and sponsored gas) at any
          time, with or without notice, if we reasonably believe you have broken these Terms, to comply with law, or to
          protect other users or ChainPot. You may stop using ChainPot at any time.
        </p>
        <p>
          Because the Protocol runs on a public blockchain, blocking access to the Interface does not take away funds you
          are owed by the Protocol; those can be claimed directly from the smart contracts.
        </p>
      </>
    ),
  },
  {
    id: 'risks',
    title: 'Risks',
    body: (
      <p>
        Using ChainPot involves serious risks, including losing some or all of the money you contribute. They are set
        out in the <Link href="/risk">Risk Disclosure</Link>, which you confirm you have read and accept.
      </p>
    ),
  },
  {
    id: 'taxes',
    title: 'Taxes',
    body: (
      <p>
        You are solely responsible for working out, reporting and paying any taxes that apply to your contributions,
        payouts, bidding discounts, interest or other amounts. We do not give tax advice and do not withhold tax unless
        the law requires it.
      </p>
    ),
  },
  {
    id: 'no-advice',
    title: 'No advice',
    body: (
      <p>
        Nothing in the Interface, our content, the demo, the FAQ or anything we say on social media is financial,
        investment, legal or tax advice, an offer of securities, or a recommendation to join any Circle. Decide for
        yourself and get independent advice if you need it.
      </p>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual property and feedback',
    body: (
      <p>
        The ChainPot name, logo, Interface design and content belong to us or our licensors. You may use the Interface
        only for its intended purpose. If you send us feedback or ideas, we may use them without any obligation to you.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer of warranties',
    body: (
      <p className="uppercase">
        To the fullest extent permitted by law, the Interface and the Protocol are provided &quot;as is&quot; and
        &quot;as available&quot;, without warranties of any kind, express or implied, including merchantability, fitness
        for a particular purpose, title, non-infringement, accuracy, availability or that they are free of errors, bugs
        or vulnerabilities. An external audit does not guarantee the smart contracts are free of defects.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p className="uppercase">
          To the fullest extent permitted by law, ChainPot and its founders, team members, contractors, affiliates and
          partners will not be liable for any indirect, incidental, special, consequential or punitive damages, or for
          any loss of funds, digital assets, profits, data or goodwill, arising from or related to: the conduct of any
          other user (including any member who defaults or acts fraudulently); smart contract, blockchain, oracle or
          third-party failures; unauthorised access to your account; or your use of or inability to use the Interface.
        </p>
        <p className="uppercase">
          Our total liability for all claims relating to the Interface is limited to the greater of the fees you paid us
          in the 12 months before the claim and one hundred US dollars (US$100).
        </p>
        <p>
          Nothing in these Terms limits liability that cannot be limited by law, such as liability for fraud or, where
          applicable, death or personal injury caused by negligence, or your rights as a consumer under mandatory law.
        </p>
      </>
    ),
  },
  {
    id: 'indemnity',
    title: 'Your responsibility to us (indemnity)',
    body: (
      <p>
        You agree to compensate and hold harmless ChainPot and its founders, team members, contractors and affiliates
        against any claims, losses, liabilities, costs and reasonable legal fees arising from your breach of these
        Terms, your breach of any law, your Circles (including anything you said or promised to other members as an
        Organiser or member), or your dispute with any other user.
      </p>
    ),
  },
  {
    id: 'member-disputes',
    title: 'Disputes between members',
    body: (
      <p>
        Disputes between members of a Circle are solely between those members. ChainPot is not obliged to take part in,
        mediate or resolve them, and you release ChainPot from any claim arising from such a dispute, to the extent
        permitted by law.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law and disputes with ChainPot',
    body: (
      <>
        <p>These Terms are governed by {governingLawText}, without regard to conflict-of-law rules.</p>
        <p>
          Before starting any formal proceeding, you agree to contact us at{' '}
          <a href={LEGAL.contactUrl} target="_blank" rel="noreferrer">{LEGAL.contactLabel}</a> and try in good faith to
          resolve the dispute for at least 30 days.
        </p>
        <p>
          Any dispute that is not resolved will be finally settled by confidential binding arbitration before a sole
          arbitrator, seated in {arbitrationSeatText}, conducted in English. Either party may seek urgent interim relief
          from a competent court.
        </p>
        <p>
          <strong>Class action waiver:</strong> to the extent permitted by law, disputes will be resolved only on an
          individual basis, not as a class, group or representative action.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: (
      <p>
        We may update these Terms. When we make a material change, we will update the version and date above and ask
        you to accept the new Terms before you continue using the Interface. Changes do not apply retroactively to
        rounds that were already completed.
      </p>
    ),
  },
  {
    id: 'general',
    title: 'General',
    body: (
      <ul>
        <li>These Terms, the Risk Disclosure and the Privacy Policy are the entire agreement between you and us about the Interface.</li>
        <li>If any part of these Terms is found unenforceable, the rest stays in force, and that part is applied to the maximum extent allowed.</li>
        <li>If we do not enforce a right, we do not waive it.</li>
        <li>You may not transfer your rights under these Terms. We may transfer ours, for example to a successor entity.</li>
        <li>We are not liable for delays or failures caused by events outside our reasonable control, including network outages, attacks, forks or changes in law.</li>
        <li>
          Questions: <a href={LEGAL.contactUrl} target="_blank" rel="noreferrer">{LEGAL.contactLabel}</a>.
        </li>
      </ul>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      intro={
        <p>
          The short version: ChainPot is software for running savings circles on audited smart contracts. We never hold
          your money, we can&apos;t reverse transactions, and we can&apos;t make another member pay. If a member stops
          paying, the rules below apply and you could lose money. Only join circles with people you trust.
        </p>
      }
      sections={sections}
    />
  );
}
