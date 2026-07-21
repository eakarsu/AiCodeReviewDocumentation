import crypto from 'crypto';
function key(){const value=process.env.DOCUMENT_ENCRYPTION_KEY;if(!value)throw new Error('DOCUMENT_ENCRYPTION_KEY_required');const decoded=Buffer.from(value,'base64');if(decoded.length!==32)throw new Error('DOCUMENT_ENCRYPTION_KEY_must_decode_to_32_bytes');return decoded;}
export function encryptText(value){const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);const ciphertext=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);return{ciphertext,iv,authTag:cipher.getAuthTag()};}
