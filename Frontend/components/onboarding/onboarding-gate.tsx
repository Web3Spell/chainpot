'use client';

import { useOnboarding } from '@/hooks/useOnboarding';
import { useCurrency } from '@/providers/currency-provider';
import { WelcomeOnboarding } from './welcome-onboarding';

/**
 * Shows the welcome intro once, but only after the country picker is done — the two modals should
 * never stack. Mounted on the dashboard (the post-sign-in home).
 */
export function OnboardingGate() {
  const { show, dismiss } = useOnboarding();
  const { country, loaded } = useCurrency();
  if (!show || !loaded || !country) return null;
  return <WelcomeOnboarding onDone={dismiss} />;
}
