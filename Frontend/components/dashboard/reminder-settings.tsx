'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useChainPotAccount } from '@/lib/aa/account';
import { useCurrency } from '@/providers/currency-provider';

type Channel = 'email' | 'sms' | 'whatsapp';
type PrefKey = 'payment_due' | 'round_started' | 'bidding_open' | 'you_received' | 'missed';

interface Profile {
  country: string | null;
  contacts: { email?: string; phone?: string };
  channels: Record<Channel, boolean>;
  prefs: Record<PrefKey, boolean>;
}

const PREF_LABEL: Record<PrefKey, string> = {
  payment_due: 'Payment due soon (2 days, 24 hours and 2 hours before)',
  round_started: 'A new round has started',
  bidding_open: 'Bidding is open (Business ROSCAs)',
  you_received: 'You received the pot',
  missed: 'A payment was missed',
};

/**
 * Where and when ChainPot reminds you. Contacts are the phone/email you signed in with (verified by
 * Privy); the server never accepts a contact typed in here. Shown only for signed-in smart accounts.
 */
export function ReminderSettings({ isDarkMode }: { isDarkMode: boolean }) {
  const account = useChainPotAccount();
  const { country } = useCurrency();
  const queryClient = useQueryClient();
  const enabled = account.mode === 'smart' && account.isConnected && !!account.getIdentityToken;

  const authed = async (init?: RequestInit) => {
    const token = await account.getIdentityToken?.();
    if (!token) throw new Error('Please sign in again.');
    const res = await fetch('/api/profile', { ...init, headers: { ...init?.headers, 'privy-id-token': token, 'content-type': 'application/json' } });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? `error ${res.status}`);
    return body as Profile;
  };

  const profile = useQuery({ queryKey: ['profile', account.address], queryFn: () => authed(), enabled, refetchInterval: false, retry: 1 });
  const [draft, setDraft] = useState<Pick<Profile, 'channels' | 'prefs'> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data && !draft) setDraft({ channels: profile.data.channels, prefs: profile.data.prefs });
  }, [profile.data, draft]);

  if (!enabled) return null;

  const card = `border-3 border-black rounded-3xl p-6 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-white text-black'}`;
  const muted = isDarkMode ? 'text-white/60' : 'text-black/60';

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await authed({ method: 'PUT', body: JSON.stringify({ ...draft, country: country?.code }) });
      queryClient.setQueryData(['profile', account.address], saved);
      setMessage('Saved ✓');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const phone = account.contacts?.phone;
  const email = account.contacts?.email;
  const channelRows: { key: Channel; label: string; available: boolean }[] = [
    { key: 'whatsapp', label: phone ? `WhatsApp to ${phone}` : 'WhatsApp (sign in with your phone to enable)', available: !!phone },
    { key: 'sms', label: phone ? `SMS to ${phone}` : 'SMS (sign in with your phone to enable)', available: !!phone },
    { key: 'email', label: email ? `Email to ${email}` : 'Email (sign in with email to enable)', available: !!email },
  ];

  return (
    <section className="py-8">
      <div className={card}>
        <h2 className="text-2xl font-bold mb-1">Reminders</h2>
        <p className={`text-sm mb-5 ${muted}`}>Missing a payment deadline costs you your place in a pot. Let us remind you.</p>
        {profile.isLoading || !draft ? (
          profile.isError ? <p className="text-sm text-red-500">{(profile.error as Error).message}</p> : <div className="h-24 animate-pulse bg-black/10 rounded-xl" />
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <fieldset>
                <legend className="text-sm font-bold mb-2">Send to</legend>
                {channelRows.map((c) => (
                  <label key={c.key} className={`flex items-center gap-2 text-sm py-1 ${c.available ? '' : 'opacity-50'}`}>
                    <input
                      type="checkbox"
                      disabled={!c.available}
                      checked={draft.channels[c.key] && c.available}
                      onChange={(e) => setDraft({ ...draft, channels: { ...draft.channels, [c.key]: e.target.checked } })}
                    />
                    {c.label}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend className="text-sm font-bold mb-2">Remind me when</legend>
                {(Object.keys(PREF_LABEL) as PrefKey[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={draft.prefs[k]} onChange={(e) => setDraft({ ...draft, prefs: { ...draft.prefs, [k]: e.target.checked } })} />
                    {PREF_LABEL[k]}
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="flex items-center gap-4 mt-5">
              <button onClick={save} disabled={saving} className={`px-6 py-3 rounded-full font-bold disabled:opacity-50 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                {saving ? 'Saving…' : 'Save reminders'}
              </button>
              {message && <span className={`text-sm ${message.startsWith('Saved') ? 'text-green-600' : 'text-red-500'}`}>{message}</span>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
