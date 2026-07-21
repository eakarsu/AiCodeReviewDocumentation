import express from 'express';
import { User, ApiKey } from '../models/index.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/crypto.js';
import { generateSecret, verifyTOTP, getTOTPUri } from '../utils/totp.js';
import { generateJWT, authMiddleware } from '../middleware/auth.js';
import { query } from '../config/database.js';
import crypto from 'crypto';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);
    const email_verification_token = generateToken();
    const user = await User.create({
      email,
      password_hash,
      name: name || email.split('@')[0],
      role: 'viewer',
      tenant_id: crypto.randomUUID(),
      email_verification_token
    });

    const token = generateJWT({ id: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenant_id, groups: [] });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, totp_code } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.tenant_id) return res.status(403).json({ error: 'Account has not been assigned to a tenant' });

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account is temporarily locked. Try again later.' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await User.update(user.id, updates);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (user.two_factor_enabled) {
      if (!totp_code) {
        return res.status(200).json({ requires_2fa: true });
      }
      if (!verifyTOTP(user.two_factor_secret, totp_code)) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Reset failed attempts and update last login
    await User.update(user.id, {
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString()
    });

    const token = generateJWT({ id: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenant_id, groups: user.groups || [] });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id, avatar_url: user.avatar_url, two_factor_enabled: user.two_factor_enabled }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.tenant_id !== req.user.tenantId) return res.status(403).json({ error: 'Tenant identity mismatch' });
    res.json({
      id: user.id, email: user.email, name: user.name, role: user.role,
      avatar_url: user.avatar_url, two_factor_enabled: user.two_factor_enabled,
      email_verified: user.email_verified, created_at: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (new_password.length < 12) {
      return res.status(400).json({ error: 'New password must be at least 12 characters' });
    }

    const user = await User.findById(req.user.id);
    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await hashPassword(new_password);
    await User.update(user.id, { password_hash });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const token = generateToken();
      await User.update(user.id, {
        password_reset_token: token,
        password_reset_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
    }
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const result = await query(
      'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];
    const password_hash = await hashPassword(new_password);
    await User.update(user.id, {
      password_hash,
      password_reset_token: null,
      password_reset_expires: null
    });
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await query('SELECT * FROM users WHERE email_verification_token = $1', [token]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    await User.update(result.rows[0].id, { email_verified: true, email_verification_token: null });
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2FA Setup - generate secret
router.post('/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const secret = generateSecret();
    await User.update(req.user.id, { two_factor_secret: secret });
    const uri = getTOTPUri(secret, req.user.email);
    res.json({ secret, uri });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2FA Enable - verify and enable
router.post('/2fa/enable', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);
    if (!user.two_factor_secret) {
      return res.status(400).json({ error: 'Run 2FA setup first' });
    }
    if (!verifyTOTP(user.two_factor_secret, code)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    await User.update(user.id, { two_factor_enabled: true });
    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2FA Disable
router.post('/2fa/disable', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    await User.update(user.id, { two_factor_enabled: false, two_factor_secret: null });
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Key CRUD
router.get('/api-keys', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT id, name, last_used_at, expires_at, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api-keys', authMiddleware, async (req, res) => {
  try {
    const { name, expires_in_days } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const rawKey = generateToken(32);
    const key_hash = rawKey; // In production, hash this
    const expires_at = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const apiKey = await ApiKey.create({ user_id: req.user.id, key_hash, name, expires_at });
    res.status(201).json({ ...apiKey, raw_key: rawKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api-keys/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'API key not found' });
    res.json({ message: 'API key deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
