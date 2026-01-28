import { Profanity, ProfanityOptions } from '@2toad/profanity';
import { religiousTermsList } from './blocked-words';

const options = new ProfanityOptions();
options.wholeWord = false;
const profanity = new Profanity(options);
// Add extra words the filter might miss
profanity.addWords(['gay', 'g4y', 'gey', 'gae', 'fag', 'f4g', 'fagg0t', 'f4gg0t']);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUsername(username: string): ValidationResult {
  // Check if username is provided
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username is required' };
  }

  const trimmedUsername = username.trim();

  // Check length (max 15 characters)
  if (trimmedUsername.length > 15) {
    return { valid: false, error: 'Username must be 15 characters or less' };
  }

  // Check minimum length
  if (trimmedUsername.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters' };
  }

  // Check for English letters, numbers, underscore, and single spaces only
  const validPattern = /^[a-zA-Z0-9_ ]+$/;
  if (!validPattern.test(trimmedUsername)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and spaces' };
  }

  // Check for consecutive spaces
  if (/  /.test(trimmedUsername)) {
    return { valid: false, error: 'Username cannot contain consecutive spaces' };
  }

  // Check for profanity using bad-words filter
  // Check both with and without spaces to catch bypasses like "F U C K"
  const lowerUsername = trimmedUsername.toLowerCase();
  const noSpacesUsername = lowerUsername.replace(/ /g, '');

  if (profanity.exists(lowerUsername) || profanity.exists(noSpacesUsername)) {
    return { valid: false, error: 'Username contains inappropriate language' };
  }

  // Check for religious terms - whole word matching only
  // Split by spaces and underscores to get individual words
  const words = lowerUsername.split(/[\s_]+/);

  for (const word of religiousTermsList) {
    // Check if any individual word matches exactly
    if (words.some(w => w === word)) {
      return { valid: false, error: 'Username contains restricted terms' };
    }
    // Check if the whole username without spaces IS the religious word (catches "g o d")
    if (noSpacesUsername === word) {
      return { valid: false, error: 'Username contains restricted terms' };
    }
  }

  return { valid: true };
}
