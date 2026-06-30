import modelData from './model.json';
import { ObservationScores, PredictionResult, TalentCategory } from '../types';

type TreeNode =
  | { type: 'split'; feature: string; threshold: number; left: TreeNode; right: TreeNode }
  | { type: 'leaf'; prediction: string; confidence: number; distribution: Record<string, number> };

const FEATURE_TO_SCORE: Record<string, keyof ObservationScores> = {
  'Bahasa (x1)': 'bahasa',
  'Motorik Halus (x2)': 'motorik_halus',
  'Motorik Kasar (x3)': 'motorik_kasar',
  'Kognitif (x4)': 'kognitif',
  'Sosial-Emosional (x5)': 'sosial_emosional',
  bahasa: 'bahasa',
  motorik_halus: 'motorik_halus',
  motorik_kasar: 'motorik_kasar',
  kognitif: 'kognitif',
  sosial_emosional: 'sosial_emosional',
};

const CATEGORY_MAP: Record<string, TalentCategory> = {
  Linguistik: 'Linguistik',
  Seni: 'Seni',
  Kinestetik: 'Kinestetik',
  'Butuh Stimulasi': 'Butuh Stimulasi',
  'Perlu Stimulasi Lanjutan': 'Butuh Stimulasi',
};

const ALL_CATEGORIES: TalentCategory[] = [
  'Linguistik',
  'Seni',
  'Kinestetik',
  'Butuh Stimulasi',
];

function mapCategory(label: string): TalentCategory {
  return CATEGORY_MAP[label] ?? 'Butuh Stimulasi';
}

function traverse(node: TreeNode, scores: ObservationScores): TreeNode {
  if (node.type === 'leaf') return node;

  const scoreKey = FEATURE_TO_SCORE[node.feature];
  if (!scoreKey) {
    throw new Error(`Fitur model tidak dikenal: ${node.feature}`);
  }

  const value = scores[scoreKey];
  // sklearn: value <= threshold → left, else → right
  return value <= node.threshold ? traverse(node.left, scores) : traverse(node.right, scores);
}

function buildProbabilities(distribution: Record<string, number>): Record<TalentCategory, number> {
  const total = Object.values(distribution).reduce((sum, v) => sum + v, 0);
  const result = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as Record<TalentCategory, number>;

  for (const [label, count] of Object.entries(distribution)) {
    const mapped = mapCategory(label);
    result[mapped] += total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  }

  return result;
}

const SCORE_FIELDS: (keyof ObservationScores)[] = [
  'bahasa',
  'motorik_halus',
  'motorik_kasar',
  'kognitif',
  'sosial_emosional',
];

export function predict(scores: ObservationScores): PredictionResult {
  for (const key of SCORE_FIELDS) {
    const val = scores[key];
    if (val < 1 || val > 4) {
      throw new Error(`${key} harus antara 1 dan 4`);
    }
  }

  const leaf = traverse(modelData.tree as TreeNode, scores);
  if (leaf.type !== 'leaf') {
    throw new Error('Prediksi gagal: pohon keputusan tidak valid');
  }

  const prediction = mapCategory(leaf.prediction);
  const probabilities = buildProbabilities(leaf.distribution);

  return {
    prediction,
    confidence: leaf.confidence,
    probabilities,
  };
}

export function getModelMetrics() {
  return {
    version: modelData.version,
    accuracy: modelData.accuracy,
    feature_names: modelData.feature_names,
    class_names: ALL_CATEGORIES,
    training_samples: modelData.training_samples,
    feature_importances: modelData.feature_importances,
    tree_depth: modelData.tree_depth,
    n_leaves: modelData.n_leaves,
    created_at: modelData.created_at,
    parameters: modelData.parameters,
  };
}

export function healthCheck(): boolean {
  return Boolean(modelData.tree);
}
