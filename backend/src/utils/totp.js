import crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const generateSecret = (length = 20) => {
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (const byte of bytes) {
    secret += BASE32_CHARS[byte % 32];
  }
  return secret;
};

const base32Decode = (encoded) => {
  let bits = '';
  for (const char of encoded.toUpperCase()) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const generateHOTP = (secret, counter) => {
  const decodedSecret = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter = counter >> 8;
  }

  const hmac = crypto.createHmac('sha1', decodedSecret);
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
};

export const generateTOTP = (secret, window = 0) => {
  const counter = Math.floor(Date.now() / 1000 / 30) + window;
  return generateHOTP(secret, counter);
};

export const verifyTOTP = (secret, token, windowSize = 1) => {
  for (let i = -windowSize; i <= windowSize; i++) {
    if (generateTOTP(secret, i) === token) {
      return true;
    }
  }
  return false;
};

export const getTOTPUri = (secret, email, issuer = 'AICodeReview') => {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
};
