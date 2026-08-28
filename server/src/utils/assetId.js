const crypto = require("crypto");

const PREFIX = "IT";
const RANDOM_LENGTH = 6;
const BASE36_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Generates a random base36 string of the given length using
 * crypto-secure randomness (not Math.random).
 */
function randomBase36(length) {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE36_CHARS[bytes[i] % BASE36_CHARS.length];
  }
  return result;
}

/**
 * Computes a single check digit (0-9) from the prefix + random segment,
 * using a weighted mod-10 sum over each character's base36 value.
 * Mirrors the idea behind IBAN check digits: catches single mistyped
 * characters and adjacent-swap typos in the vast majority of cases.
 */
function computeCheckDigit(payload) {
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const charValue = BASE36_CHARS.indexOf(payload[i].toUpperCase());
    const weight = i % 2 === 0 ? 2 : 1;
    sum += charValue * weight;
  }
  return sum % 10;
}

/**
 * Generates a new random Asset ID in the form: IT-XXXXXX-C
 * Does not check the database for collisions — call ensureUniqueAssetId
 * for that (collisions are astronomically unlikely at this length, but
 * checked anyway since a duplicate ID would be a real problem).
 */
function generateAssetId() {
  const randomPart = randomBase36(RANDOM_LENGTH);
  const checkDigit = computeCheckDigit(PREFIX + randomPart);
  return `${PREFIX}-${randomPart}-${checkDigit}`;
}

/**
 * Validates that an Asset ID string matches the expected format AND
 * that its check digit is correct. Use this to catch typos when a
 * user searches for or enters an Asset ID manually.
 */
function isValidAssetId(assetId) {
  if (typeof assetId !== "string") return false;
  const match = assetId
    .trim()
    .toUpperCase()
    .match(/^IT-([0-9A-Z]{6})-(\d)$/);
  if (!match) return false;
  const [, randomPart, checkDigit] = match;
  return computeCheckDigit(PREFIX + randomPart) === Number(checkDigit);
}

/**
 * Generates an Asset ID and confirms it doesn't already exist in the
 * given Mongoose model (checked on the `assetId` field), retrying on
 * the rare collision.
 */
async function ensureUniqueAssetId(Model, fieldName = "assetId") {
  let candidate;
  let exists = true;
  let attempts = 0;

  while (exists) {
    candidate = generateAssetId();
    exists = await Model.exists({ [fieldName]: candidate });
    attempts += 1;
    if (attempts > 10) {
      throw new Error("Could not generate a unique Asset ID after 10 attempts");
    }
  }

  return candidate;
}

module.exports = { generateAssetId, isValidAssetId, ensureUniqueAssetId };
