import { Request } from 'express';

export type UserRole = 'admin' | 'guru';

export type TalentCategory = 'Linguistik' | 'Seni' | 'Kinestetik' | 'Butuh Stimulasi';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface ObservationScores {
  bahasa: number;
  motorik_halus: number;
  motorik_kasar: number;
  kognitif: number;
  sosial_emosional: number;
}

export interface PredictionResult {
  prediction: TalentCategory;
  confidence: number;
  probabilities: Record<TalentCategory, number>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  errors?: Array<{ msg: string; path?: string }>;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
