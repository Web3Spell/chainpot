'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type QA = { q: string; a: React.ReactNode };
type Group = { id: string; label: string; items: QA[] };

/** Every answer here must match the audited V4 contracts and the Terms. Update both together. */
export const FAQ_GROUPS: Group[] = [
  {
    id: 'basics',
    label: 'Basics',
    items: [
      {
        q: 'What is ChainPot?',
        a: 'A savings circle (also called a chit fund, committee, kitty, tontine, susu or hui) that runs on smart contracts. A group agrees an amount, everyone pays in each round, and one member takes the whole pot each round until everyone has had a turn.',
      },
      {
        q: 'Why use ChainPot instead of a normal committee?',
        a: 'Nobody has to hold the cash, the draw can’t be fixed, every payment is recorded publicly, reminders are automatic, and waiting money can earn interest. The rules are code everyone shares, not one person’s notebook.',
      },
      {
        q: 'Who is it for?',
        a: 'Friends, families, colleagues and communities who already trust each other and want a simple, fair way to save together. It is not a way to save with strangers.',
      },
      {
        q: 'Do I need to know crypto?',
        a: 'No. You sign in with your phone, email, Google, Apple or a passkey. ChainPot creates a smart account for you. There is no seed phrase, and you never pay network fees.',
      },
      {
        q: 'What money does a circle use?',
        a: 'USDC, a digital US dollar. The app shows every amount in your local currency too, but what you pay and receive is fixed in USDC.',
      },
      {
        q: 'Is ChainPot live?',
        a: 'It is live on the Base Sepolia testnet, where you can run a full circle with test money that has no value. Mainnet, with real USDC, is coming soon. Follow @_chainpot for the date.',
      },
    ],
  },
  {
    id: 'circles',
    label: 'Starting & joining',
    items: [
      {
        q: 'How do I start a circle?',
        a: 'Tap Start a circle, give it a name, choose the amount per round, how often rounds happen, how many members, and whether the receiver is picked by draw or by bidding. You get one invite link to share.',
      },
      {
        q: 'How many people can be in a circle, and how much can we save?',
        a: 'Between 2 and 100 members, from 1 USDC per round. Each round must give members at least 1 day to pay. During the beta we may set lower limits in the app.',
      },
      {
        q: 'Does the creator have to be a member?',
        a: 'In the ChainPot app, yes: whoever creates a circle takes one of the seats and pays and receives like everyone else. The creator has no special share and gets nothing from other members’ money.',
      },
      {
        q: 'What can the organiser control?',
        a: 'Before the circle starts, the organiser can remove someone from the invite list and taps Start once everyone has joined. After that the organiser is a normal member with no control over money, payouts or the draw.',
      },
      {
        q: 'How do people join?',
        a: 'They open your invite link, sign in and take a seat. When the organiser creates the circle on-chain, each member taps Join. Only people on the invite list can join.',
      },
      {
        q: 'Can I leave a circle?',
        a: 'Yes, but only before it starts, and leaving lowers your reputation a little. Once the circle starts, the only way out is to stop paying, which counts as a default (see Missed payments).',
      },
      {
        q: 'Can someone join after the circle starts?',
        a: 'No. The member list is locked when the organiser taps Start, so the rules can’t change halfway through.',
      },
      {
        q: 'How many circles can I be in?',
        a: 'Up to 50 at the same time.',
      },
      {
        q: 'What if the organiser never starts the circle?',
        a: 'Nothing is charged until a round starts, so no money is at risk. You can leave the circle before it starts.',
      },
    ],
  },
  {
    id: 'paying',
    label: 'Paying & receiving',
    items: [
      {
        q: 'When and how do I pay?',
        a: 'When a round opens you see Pay with the exact amount and the due date. One tap and one confirmation. We cover the network fee.',
      },
      {
        q: 'How do rounds run?',
        a: 'Rounds start on the schedule the circle agreed (for example monthly). A round can’t start before its time, so nobody can rush you. Each round has a payment window; after it closes, the receiver is picked.',
      },
      {
        q: 'Do I keep paying after I receive the pot?',
        a: 'Yes. Everyone pays every round until the circle ends. Stopping after you receive is a default, and it hurts the friends who are still waiting for their turn.',
      },
      {
        q: 'How do I get my money when it’s my turn?',
        a: 'The pot is credited to you in the vault, and one tap moves it to your balance. Money credited to you can always be withdrawn, even if the contracts are paused.',
      },
      {
        q: 'How do I add money?',
        a: 'Send USDC on Base to your ChainPot account, or (on mainnet) buy USDC with your local money through our on-ramp partner Transak, for example with UPI or a card.',
      },
      {
        q: 'Can I turn on autopay?',
        a: 'Yes. Autopay pays your round on time and is locked on-chain to that one circle only. Keep enough USDC in your balance; autopay can’t pay with money you don’t have.',
      },
      {
        q: 'Will I be reminded?',
        a: 'Yes: 2 days, 1 day and 2 hours before every due date, by email, SMS or WhatsApp, whichever you turn on. Reminders help but can be delayed, so paying on time is still your responsibility.',
      },
    ],
  },
  {
    id: 'missed',
    label: 'Missed payments',
    items: [
      {
        q: 'What happens if I forget to pay?',
        a: 'When the payment window closes, anyone who hasn’t paid is marked as defaulted in that circle, automatically. There is no grace period and nobody, including us, can undo it.',
      },
      {
        q: 'Do I get my earlier payments back?',
        a: 'No. Your earlier payments were part of pots already paid out to other members, so there is nothing to refund. You also stop receiving any share of interest or bidding discounts from that circle.',
      },
      {
        q: 'Can I rejoin the circle or pay late?',
        a: 'No. A defaulted member can’t pay, bid, receive the pot or rejoin that circle. You can still join other circles unless you have defaulted twice.',
      },
      {
        q: 'Is there any other penalty?',
        a: 'Your ChainPot reputation drops. A second default in any circle bars you from joining or creating circles on ChainPot.',
      },
      {
        q: 'What happens to the others when someone defaults?',
        a: 'Everyone else keeps paying the same amount. Later pots are simply smaller, because the missing member’s share isn’t collected. That share does not go to the organiser or to ChainPot. If no one is left who still needs a turn, the circle ends early.',
      },
      {
        q: 'Example: 5 friends at $50, one stops paying',
        a: 'Rounds 1 and 2 pay $250 each. Aman misses round 3, so rounds 3 and 4 pay $200 each and the circle ends after round 4. The first two receivers are $50 ahead, the last two break even (plus interest), and Aman is $100 down.',
      },
      {
        q: 'What if paying is impossible because ChainPot is down?',
        a: 'If the contracts are paused in an emergency, every deadline is extended by the time they were paused, so no one defaults because of a pause.',
      },
    ],
  },
  {
    id: 'cheaters',
    label: 'Cheaters & trust',
    items: [
      {
        q: 'Can someone take the pot and run?',
        a: 'Yes, and this is the main risk in any savings circle. A member who has already received the pot can stop paying and keep it. ChainPot takes no collateral, can’t force anyone to pay and doesn’t cover the loss. That person loses their reputation and is banned after a second default.',
      },
      {
        q: 'So how do I protect myself?',
        a: 'Only save with people you know and trust, start with small amounts, prefer shorter circles, encourage autopay, and agree as a group what happens if someone stops paying. In a bidding circle, the person who needs money earliest pays for it with a lower bid.',
      },
      {
        q: 'Will ChainPot chase or sue someone who didn’t pay?',
        a: 'No. ChainPot isn’t a party to your circle. Any claim is between you and that member. Every payment is on a public blockchain, so you have a clear record if you choose to take it further, and we respond to valid legal requests.',
      },
      {
        q: 'Can the organiser run off with the money?',
        a: 'No. The organiser never holds the money. Payments go straight into the audited vault, and only the member picked for a round can withdraw that round’s pot.',
      },
      {
        q: 'Can ChainPot take our money?',
        a: (
          <>
            There is no function that lets us withdraw members’ contributions. An admin multi-sig can pause the contracts
            in an emergency and can add a new engine contract only after a public 2-day delay. Details are in section 12
            of the <Link href="/terms">Terms</Link>.
          </>
        ),
      },
      {
        q: 'Can someone use fake accounts to game a circle?',
        a: 'Only people on the organiser’s invite list can join, and each seat is tied to one account. Using fake or multiple accounts breaks our Terms and gets you banned.',
      },
    ],
  },
  {
    id: 'draw',
    label: 'Draw & bidding',
    items: [
      {
        q: 'How is the receiver picked in a draw circle?',
        a: 'Chainlink VRF produces a random number with a proof anyone can verify on-chain, and it picks from members who paid this round and haven’t received the pot yet. Nobody can rig it, not even the organiser.',
      },
      {
        q: 'What if Chainlink is slow?',
        a: 'The draw is retried. After a long outage, a fallback on-chain random source is used so the circle never gets stuck.',
      },
      {
        q: 'How does bidding work?',
        a: 'After the payment window, members who haven’t received yet can bid the amount they’d accept. The lowest bid wins and gets that amount; the difference is shared among the other members. Each new bid must be lower than the current lowest.',
      },
      {
        q: 'Bidding example',
        a: 'The pot is $250. Rahul bids $230 and wins. He takes $230 now, and the other four members share the $20 difference ($5 each).',
      },
      {
        q: 'Can I cancel a bid?',
        a: 'No, bids are binding. You can only bid lower.',
      },
      {
        q: 'What if nobody bids?',
        a: 'The receiver is picked by a fair Chainlink draw among eligible members, and they get the full pot.',
      },
      {
        q: 'Isn’t this gambling or a lottery?',
        a: 'No. Every member pays the same and receives the pot exactly once. The draw or auction only decides the order of turns, not who wins money.',
      },
    ],
  },
  {
    id: 'money',
    label: 'Fees & interest',
    items: [
      {
        q: 'Does ChainPot charge fees?',
        a: 'Saving in a circle is free and gas is sponsored. The only cut today is 20% of any interest the vault earns, which goes to the ChainPot safety fund. Your contributions are never touched.',
      },
      {
        q: 'How does interest work?',
        a: 'Money waiting in the vault between payment and payout is supplied to Compound and can earn interest. It is variable, can be zero, and isn’t guaranteed. In draw circles it is shared among members who haven’t defaulted; in bidding circles among those who didn’t win that round.',
      },
      {
        q: 'Will it always be free?',
        a: 'We plan to keep saving free. If we ever add a fee, you’ll see it in the app before you agree to anything it applies to.',
      },
      {
        q: 'Do I pay tax on this?',
        a: 'It depends on where you live. You’re responsible for your own taxes; ask a local tax adviser if unsure.',
      },
    ],
  },
  {
    id: 'security',
    label: 'Account & security',
    items: [
      {
        q: 'Who holds the money?',
        a: 'Nobody. Payments go into an audited smart-contract vault. It only pays the member the rules select for that round, and only that member can withdraw it.',
      },
      {
        q: 'Are the contracts audited?',
        a: 'Yes, by Certora, and the app only uses the audited code. Audits reduce risk but can’t guarantee there are no bugs.',
      },
      {
        q: 'What if I lose my phone?',
        a: 'Sign in again with the same email, Google or Apple account, or passkey. Your account is tied to your login, not to one device. Keep your login methods secure; anyone who controls them could move your funds.',
      },
      {
        q: 'Will ChainPot ever ask for my code or password?',
        a: 'Never. Anyone asking for your login code is trying to scam you.',
      },
      {
        q: 'Is my activity private?',
        a: (
          <>
            Your phone and email stay private (see the <Link href="/privacy">Privacy Policy</Link>), but payments, bids
            and payouts are public on the blockchain under your account address.
          </>
        ),
      },
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    items: [
      {
        q: 'Is ChainPot a bank or a chit fund company?',
        a: 'No. ChainPot is software. We don’t hold money, take deposits, run circles for profit, or act as a chit fund foreman. Each circle is an arrangement among its members.',
      },
      {
        q: 'Is it legal where I live?',
        a: 'Laws on savings circles and digital assets vary by country. You’re responsible for following yours. Don’t use ChainPot to run a commercial chit business or advertise circles to the public where that needs a licence.',
      },
      {
        q: 'Who can use ChainPot?',
        a: 'Adults (18+) who aren’t on a sanctions list and are allowed to use it where they live.',
      },
      {
        q: 'Where are the full rules?',
        a: (
          <>
            In our <Link href="/terms">Terms of Service</Link>, <Link href="/risk">Risk Disclosure</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>, which you accept before using ChainPot.
          </>
        ),
      },
    ],
  },
];

export function Faq({ cardClass }: { cardClass: string }) {
  const [group, setGroup] = useState<string>('all');
  const items = useMemo(
    () => (group === 'all' ? FAQ_GROUPS.flatMap((g) => g.items) : FAQ_GROUPS.find((g) => g.id === group)?.items ?? []),
    [group],
  );

  return (
    <div>
      <div role="tablist" aria-label="FAQ topics" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:flex-wrap">
        {[{ id: 'all', label: 'All' }, ...FAQ_GROUPS].map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={group === g.id}
            onClick={() => setGroup(g.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              group === g.id ? 'bg-cp-ink text-cp-ink-inverse' : 'border border-cp-line-soft bg-cp-surface text-cp-ink hover:bg-cp-accent-soft'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {items.map((f) => (
          <details key={f.q} className={`${cardClass} group p-0 [&_summary::-webkit-details-marker]:hidden`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold text-cp-ink">
              {f.q}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cp-surface-muted text-lg transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed text-cp-muted [&_a]:font-semibold [&_a]:text-cp-accent [&_a]:underline-offset-4 hover:[&_a]:underline">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
