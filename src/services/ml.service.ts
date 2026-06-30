import { ObservationScores, PredictionResult } from '../types';
import { logger } from '../utils/logger';
import * as cartPredictor from '../model/cart.predictor';

export class MLService {
  async predict(scores: ObservationScores): Promise<PredictionResult> {
    logger.debug('Menjalankan prediksi CART lokal', scores);
    const result = cartPredictor.predict(scores);
    logger.debug('Hasil prediksi:', result);
    return result;
  }

  async getModelMetrics() {
    return cartPredictor.getModelMetrics();
  }

  async healthCheck(): Promise<boolean> {
    return cartPredictor.healthCheck();
  }

  /** Retrain dinonaktifkan — model statis dari cart_model_bakat_anak.pkl */
  async retrain(): Promise<never> {
    throw new Error('Retrain dinonaktifkan. Model CART statis digunakan untuk deployment Vercel.');
  }
}

export const mlService = new MLService();
