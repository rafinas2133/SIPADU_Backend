import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

// ─── Class Model ──────────────────────────────────────────────────────────────

interface ClassAttributes {
  id: string;
  name: string;
  teacher_id: string;
  academic_year: string;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type ClassCreationAttributes = Optional<ClassAttributes, 'id' | 'academic_year' | 'description'>;

export class Class extends Model<ClassAttributes, ClassCreationAttributes> implements ClassAttributes {
  declare id: string;
  declare name: string;
  declare teacher_id: string;
  declare academic_year: string;
  declare description: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Class.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    teacher_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    academic_year: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '2025/2026' },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'classes', modelName: 'Class' }
);

Class.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });
User.hasMany(Class, { foreignKey: 'teacher_id', as: 'classes' });

// ─── Child Model ──────────────────────────────────────────────────────────────

interface ChildAttributes {
  id: string;
  nis: string;
  name: string;
  birth_date: Date;
  gender: 'L' | 'P';
  class_id: string;
  parent_user_id?: string | null;
  photo_path?: string | null;
  notes?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type ChildCreationAttributes = Optional<
  ChildAttributes,
  'id' | 'parent_user_id' | 'photo_path' | 'notes'
>;

export class Child extends Model<ChildAttributes, ChildCreationAttributes> implements ChildAttributes {
  declare id: string;
  declare nis: string;
  declare name: string;
  declare birth_date: Date;
  declare gender: 'L' | 'P';
  declare class_id: string;
  declare parent_user_id: string | null;
  declare photo_path: string | null;
  declare notes: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Child.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nis: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    birth_date: { type: DataTypes.DATEONLY, allowNull: false },
    gender: { type: DataTypes.ENUM('L', 'P'), allowNull: false },
    class_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'classes', key: 'id' } },
    parent_user_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    photo_path: { type: DataTypes.STRING(255), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'children', modelName: 'Child' }
);

Child.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(Child, { foreignKey: 'class_id', as: 'children' });
Child.belongsTo(User, { foreignKey: 'parent_user_id', as: 'parent' });
User.hasMany(Child, { foreignKey: 'parent_user_id', as: 'children' });
