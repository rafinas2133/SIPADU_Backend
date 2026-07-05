import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { UserRole } from '../types';

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  refresh_token?: string | null;
  reset_token?: string | null;
  reset_token_expires?: Date | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'is_active' | 'refresh_token' | 'reset_token' | 'reset_token_expires'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password_hash: string;
  declare role: UserRole;
  declare refresh_token: string | null;
  declare reset_token: string | null;
  declare reset_token_expires: Date | null;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'guru'),
      allowNull: false,
      defaultValue: 'guru',
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
  }
);
