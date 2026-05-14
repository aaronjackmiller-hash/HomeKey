const COMPANY_TOKEN_BLACKLIST = new Set([
  'real',
  'realty',
  'realestate',
  'estate',
  'solution',
  'solutions',
  'service',
  'services',
  'agency',
  'group',
  'office',
  'homes',
  'properties',
  'property',
  'brokers',
  'brokerage',
  'team',
  'נדלן',
  'תיווך',
  'משרד',
]);

const safeText = (value) => (typeof value === 'string' ? value.trim() : '');

const dedupeRepeatingPhrase = (value) => {
  const text = safeText(value);
  if (!text) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return text;
  const maxPhraseLen = Math.min(6, Math.floor(words.length / 2));
  for (let phraseLen = maxPhraseLen; phraseLen >= 1; phraseLen -= 1) {
    const phrase = words.slice(0, phraseLen).join(' ');
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const repeated = words
      .join(' ')
      .replace(new RegExp(`^(?:${escaped}\\s+){2,}`, 'i'), `${phrase} `)
      .trim();
    if (repeated.length < text.length) return repeated;
  }
  return text;
};

const tokenizeName = (name = '') =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^[^A-Za-zא-ת]+|[^A-Za-zא-ת]+$/g, ''))
    .filter(Boolean);

const isCompanyLikeToken = (token = '') => COMPANY_TOKEN_BLACKLIST.has(String(token || '').toLowerCase());

const hasHebrew = (value = '') => /[א-ת]/.test(String(value || ''));

const hasLatin = (value = '') => /[A-Za-z]/.test(String(value || ''));

const isLikelyPersonName = (value = '') => {
  const normalized = safeText(value);
  if (!normalized) return false;
  const tokens = tokenizeName(normalized);
  if (tokens.length === 0) return false;
  if (tokens.length >= 2) {
    const meaningfulTokens = tokens.filter((token) => !isCompanyLikeToken(token));
    return meaningfulTokens.length >= 2;
  }
  const [singleToken] = tokens;
  if (!singleToken || isCompanyLikeToken(singleToken)) return false;
  // Single Hebrew/Latin names are valid if they don't look like agencies.
  return hasHebrew(singleToken) || hasLatin(singleToken);
};

const normalizeCandidateName = (value = '') => dedupeRepeatingPhrase(safeText(value));

const firstPersonLikeName = (values = []) => {
  for (const value of values) {
    const normalized = normalizeCandidateName(value);
    if (!normalized) continue;
    if (isLikelyPersonName(normalized)) return normalized;
  }
  return '';
};

export const pickBestContactName = ({
  directName = '',
  agentName = '',
  externalName = '',
} = {}) => {
  const personLike = firstPersonLikeName([agentName, directName, externalName]);
  if (personLike) return personLike;
  return '';
};

export const getContactFirstName = (name = '') => {
  const tokens = tokenizeName(name);
  if (tokens.length === 0) return '';
  const firstMeaningful = tokens.find((token) => !isCompanyLikeToken(token));
  return firstMeaningful || '';
};

export const buildAgentInterestMessage = (contactName = '', listingTitle = 'this listing') => {
  const firstName = getContactFirstName(contactName) || 'there';
  const normalizedListingTitle = safeText(listingTitle) || 'this listing';
  return `Hi ${firstName}, I was on HomeKey and I am interested in ${normalizedListingTitle}.`;
};

