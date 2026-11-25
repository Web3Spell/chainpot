// Single source for the legal documents' version and the operator details they reference.
// Bump TERMS_VERSION whenever /terms, /privacy or /risk change materially: every user is asked to
// accept again, and the new acceptance is recorded server-side (see app/api/terms).

export const TERMS_VERSION = '2026-11-25';
export const TERMS_UPDATED = '25 November 2026';

export const LEGAL = {
  /** The legal person operating chainpot.fun. Replace with the registered entity name once incorporated. */
  operator: 'the operator of ChainPot',
  /** Country/state whose courts and laws govern the Terms. Empty = the operator's place of establishment. */
  governingLaw: '',
  /** Seat of arbitration. Empty = the operator's place of establishment. */
  arbitrationSeat: '',
  /** Where users can reach us about legal or privacy matters. */
  contactUrl: 'https://x.com/_chainpot',
  contactLabel: '@_chainpot on X',
  site: 'chainpot.fun',
} as const;

/** Paths that must stay readable before someone accepts (they are what is being accepted). */
export const LEGAL_PATHS = ['/terms', '/privacy', '/risk'];

export const governingLawText = LEGAL.governingLaw
  ? `the laws of ${LEGAL.governingLaw}`
  : 'the laws of the jurisdiction in which the operator of ChainPot is established';

export const arbitrationSeatText = LEGAL.arbitrationSeat || 'the place where the operator of ChainPot is established';
