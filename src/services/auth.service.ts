import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models';
import { JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
  // ── Password ──────────────────────────────────────────────────────────────

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ── Token generation ──────────────────────────────────────────────────────

  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
  }

  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  }

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Omit<User, 'password_hash' | 'refresh_token'>;
  }> {
    const user = await User.findOne({ where: { email, is_active: true } });

    if (!user) {
      throw new Error('Email atau password salah');
    }

    const valid = await this.comparePassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Email atau password salah');
    }

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    await user.update({ refresh_token: refreshToken });

    const { password_hash, refresh_token, reset_token, reset_token_expires, ...safeUser } = user.toJSON();

    return { accessToken, refreshToken, user: safeUser as Omit<User, 'password_hash' | 'refresh_token'> };
  }

  // ── Refresh token ─────────────────────────────────────────────────────────

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: JwtPayload;

    try {
      payload = this.verifyRefreshToken(refreshToken);
    } catch {
      throw new Error('Refresh token tidak valid atau kedaluwarsa');
    }

    const user = await User.findOne({
      where: { id: payload.userId, refresh_token: refreshToken, is_active: true },
    });

    if (!user) {
      throw new Error('Refresh token tidak ditemukan');
    }

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await User.update({ refresh_token: null }, { where: { id: userId } });
  }

  // ── Forgot / Reset password ───────────────────────────────────────────────

  async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ where: { email, is_active: true } });

    if (!user) {
      // Jangan ungkapkan apakah email ada atau tidak (security)
      return 'Jika email terdaftar, link reset telah dikirim';
    }

    const token = this.generateResetToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    await user.update({ reset_token: token, reset_token_expires: expires });

    // TODO: Kirim email dengan link: /reset-password?token=xxx
    // await emailService.sendResetPasswordEmail(user.email, token);

    return 'Jika email terdaftar, link reset telah dikirim';
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      where: { reset_token: token },
    });

    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      throw new Error('Token reset tidak valid atau sudah kedaluwarsa');
    }

    const password_hash = await this.hashPassword(newPassword);

    await user.update({
      password_hash,
      reset_token: null,
      reset_token_expires: null,
    });
  }
}

export const authService = new AuthService();
