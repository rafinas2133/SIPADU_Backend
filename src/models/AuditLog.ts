import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

// ─── ModelHistory ─────────────────────────────────────────────────────────────

interface ModelHistoryAttributes {
  id: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  training_samples: number;
  confusion_matrix: number[][];
  parameters: Record<string, unknown>;
  trained_by: string;
  is_active: boolean;
  created_at?: Date;
}

type ModelHistoryCreationAttributes = Optional<ModelHistoryAttributes, 'id' | 'is_active'>;

export class ModelHistory extends Model<ModelHistoryAttributes, ModelHistoryCreationAttributes>
  implements ModelHistoryAttributes {
  declare id: string;
  declare version: string;
  declare accuracy: number;
  declare precision: number;
  declare recall: number;
  declare f1_score: number;
  declare training_samples: number;
  declare confusion_matrix: number[][];
  declare parameters: Record<string, unknown>;
  declare trained_by: string;
  declare is_active: boolean;
  declare created_at: Date;
}

ModelHistory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    version: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    accuracy: { type: DataTypes.FLOAT, allowNull: false },
    precision: { type: DataTypes.FLOAT, allowNull: false },
    recall: { type: DataTypes.FLOAT, allowNull: false },
    f1_score: { type: DataTypes.FLOAT, allowNull: false },
    training_samples: { type: DataTypes.INTEGER, allowNull: false },
    confusion_matrix: { type: DataTypes.JSONB, allowNull: false },
    parameters: { type: DataTypes.JSONB, allowNull: false },
    trained_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName: 'model_histories',
    modelName: 'ModelHistory',
    updatedAt: false,
  }
);

ModelHistory.belongsTo(User, { foreignKey: 'trained_by', as: 'trainer' });

// ─── AuditLog ─────────────────────────────────────────────────────────────────

interface AuditLogAttributes {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: Date;
}

type AuditLogCreationAttributes = Optional<
  AuditLogAttributes,
  'id' | 'target_id' | 'details' | 'ip_address'
>;

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes {
  declare id: string;
  declare user_id: string;
  declare action: string;
  declare target_type: string;
  declare target_id: string | null;
  declare details: Record<string, unknown> | null;
  declare ip_address: string | null;
  declare created_at: Date;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    action: { type: DataTypes.STRING(100), allowNull: false },
    target_type: { type: DataTypes.STRING(50), allowNull: false },
    target_id: { type: DataTypes.UUID, allowNull: true },
    details: { type: DataTypes.JSONB, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    modelName: 'AuditLog',
    updatedAt: false,
  }
);

AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
