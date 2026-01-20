// Common email domain typos and their corrections
const DOMAIN_TYPOS: Record<string, string> = {
  // Gmail typos
  'gnail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmailcom': 'gmail.com',
  'g]mail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmaiil.com': 'gmail.com',
  
  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yaoo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  
  // Hotmail typos
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  
  // Outlook typos
  'outloo.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outlookk.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outloook.com': 'outlook.com',
  
  // iCloud typos
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'icloud.cm': 'icloud.com',
  'icloud.con': 'icloud.com',
  
  // Common TLD typos
  '.coom': '.com',
  '.comm': '.com',
  '.cim': '.com',
  '.vom': '.com',
  '.xom': '.com',
  '.ocm': '.com',
};

// Valid common email domains
const VALID_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
];

// Basic email format regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailValidationResult {
  isValid: boolean;
  error: string | null;
  suggestion?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  const trimmedEmail = email.trim().toLowerCase();
  
  // Check basic format
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }
  
  // Extract domain
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }
  
  const domain = parts[1];
  
  // Check for known typos
  if (DOMAIN_TYPOS[domain]) {
    const correctedDomain = DOMAIN_TYPOS[domain];
    const suggestedEmail = `${parts[0]}@${correctedDomain}`;
    return {
      isValid: false,
      error: `Did you mean ${suggestedEmail}?`,
      suggestion: suggestedEmail,
    };
  }
  
  // Check for partial TLD typos at the end
  for (const [typo, correct] of Object.entries(DOMAIN_TYPOS)) {
    if (typo.startsWith('.') && domain.endsWith(typo.slice(1))) {
      const correctedDomain = domain.slice(0, -typo.length + 1) + correct.slice(1);
      const suggestedEmail = `${parts[0]}@${correctedDomain}`;
      return {
        isValid: false,
        error: `Did you mean ${suggestedEmail}?`,
        suggestion: suggestedEmail,
      };
    }
  }
  
  // Check for suspicious domains (very short TLDs, missing TLD)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return {
      isValid: false,
      error: 'Please enter a valid email domain',
    };
  }
  
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }
  
  return {
    isValid: true,
    error: null,
  };
}
