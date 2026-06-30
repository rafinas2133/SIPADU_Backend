import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Child } from './Class';
import { User } from './User';
import { TalentCategory } from '../types';

// ─── Observation Model ────────────────────────────────────────────────────────

export type ObservationStatus = 'draft' | 'final';

interface ObservationAttributes {
  id: string;
  child_id: string;
  teacher_id: string;
  observation_date: Date;
  bahasa: 1 | 2 | 3 | 4;
  motorik_halus: 1 | 2 | 3 | 4;
  motorik_kasar: 1 | 2 | 3 | 4;
  kognitif: 1 | 2 | 3 | 4;
  sosial_emosional: 1 | 2 | 3 | 4;
  note?: string | null;
  attachment_path?: string | null;
  status: ObservationStatus;
  created_at?: Date;
  updated_at?: Date;
}

type ObservationCreationAttributes = Optional<ObservationAttributes, 'id' | 'note' | 'attachment_path' | 'status'>;

export class Observation extends Model<ObservationAttributes, ObservationCreationAttributes> implements ObservationAttributes {
  declare id: string;
  declare child_id: string;
  declare teacher_id: string;
  declare observation_date: Date;
  declare bahasa: 1 | 2 | 3 | 4;
  declare motorik_halus: 1 | 2 | 3 | 4;
  declare motorik_kasar: 1 | 2 | 3 | 4;
  declare kognitif: 1 | 2 | 3 | 4;
  declare sosial_emosional: 1 | 2 | 3 | 4;
  declare note: string | null;
  declare attachment_path: string | null;
  declare status: ObservationStatus;
  declare created_at: Date;
  declare updated_at: Date;
}

Observation.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    child_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'children', key: 'id' } },
    teacher_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    observation_date: { type: DataTypes.DATEONLY, allowNull: false },
    bahasa: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 4 } },
    motorik_halus: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 4 } },
    motorik_kasar: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 4 } },
    kognitif: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 4 } },
    sosial_emosional: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 4 } },
    note: { type: DataTypes.TEXT, allowNull: true },
    attachment_path: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'final'), defaultValue: 'final' },
  },
  { sequelize, tableName: 'observations', modelName: 'Observation' }
);

Observation.belongsTo(Child, { foreignKey: 'child_id', as: 'child' });
Observation.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });
Child.hasMany(Observation, { foreignKey: 'child_id', as: 'observations' });

// ─── Prediction Model ─────────────────────────────────────────────────────────

interface PredictionAttributes {
  id: string;
  observation_id: string;
  child_id: string;
  prediction: TalentCategory;
  confidence: number;
  probabilities: Record<TalentCategory, number>;
  model_version: string;
  created_at?: Date;
}

type PredictionCreationAttributes = Optional<PredictionAttributes, 'id'>;

export class Prediction extends Model<PredictionAttributes, PredictionCreationAttributes> implements PredictionAttributes {
  declare id: string;
  declare observation_id: string;
  declare child_id: string;
  declare prediction: TalentCategory;
  declare confidence: number;
  declare probabilities: Record<TalentCategory, number>;
  declare model_version: string;
  declare created_at: Date;
}

Prediction.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    observation_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'observations', key: 'id' } },
    child_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'children', key: 'id' } },
    prediction: { type: DataTypes.ENUM('Linguistik', 'Seni', 'Kinestetik', 'Butuh Stimulasi'), allowNull: false },
    confidence: { type: DataTypes.FLOAT, allowNull: false },
    probabilities: { type: DataTypes.JSONB, allowNull: false },
    model_version: { type: DataTypes.STRING(50), allowNull: false },
  },
  {
    sequelize,
    tableName: 'predictions',
    modelName: 'Prediction',
    updatedAt: false,
  }
);

Prediction.belongsTo(Observation, { foreignKey: 'observation_id', as: 'observation' });
Observation.hasOne(Prediction, { foreignKey: 'observation_id', as: 'prediction' });
Prediction.belongsTo(Child, { foreignKey: 'child_id', as: 'child' });
