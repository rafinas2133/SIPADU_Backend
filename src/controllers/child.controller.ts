import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import { Child, Class, User, Observation } from '../models';
import { childService } from '../services/child.service';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { calculateAge } from '../utils/helpers';

export class ChildController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const classId = req.query.class_id as string;
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (search) where.name = { [Op.iLike]: `%${search}%` };
      if (classId) where.class_id = classId;

      if (req.user?.role === 'guru') {
        const classes = await Class.findAll({ where: { teacher_id: req.user.userId }, attributes: ['id'] });
        where.class_id = { [Op.in]: classes.map((c) => c.id) };
      }

      if (req.user?.role === 'orang_tua') {
        where.parent_user_id = req.user.userId;
      }

      const { count, rows } = await Child.findAndCountAll({
        where,
        include: [
          { model: Class, as: 'class', attributes: ['id', 'name'] },
          { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        ],
        limit,
        offset,
        order: [['name', 'ASC']],
        distinct: true,
      });

      sendSuccess(res, rows, 'Data siswa berhasil diambil', 200, {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const child = await childService.findById(req.params.id);

      if (!child) {
        sendError(res, 'Siswa tidak ditemukan', 404);
        return;
      }

      const progress = await childService.getProgressStats(req.params.id);

      sendSuccess(res, {
        ...child.toJSON(),
        age: calculateAge(child.birth_date),
        progress,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(res, 'Validasi gagal', 422, errors.array().map((e) => ({ msg: e.msg })));
        return;
      }

      const { name, nis, birth_date, gender, class_id, parent_user_id, notes } = req.body;

      const kelas = await Class.findByPk(class_id);
      if (!kelas) {
        sendError(res, 'Kelas tidak ditemukan', 404);
        return;
      }

      const existing = await Child.findOne({ where: { nis } });
      if (existing) {
        sendError(res, 'NIS sudah terdaftar', 409);
        return;
      }

      const child = await Child.create({
        name, nis, birth_date, gender, class_id, parent_user_id, notes,
      });

      const result = await Child.findByPk(child.id, {
        include: [{ model: Class, as: 'class', attributes: ['id', 'name'] }],
      });

      sendCreated(res, result, 'Siswa berhasil ditambahkan');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const child = await Child.findByPk(req.params.id);
      if (!child) {
        sendError(res, 'Siswa tidak ditemukan', 404);
        return;
      }

      const { name, nis, birth_date, gender, class_id, parent_user_id, notes } = req.body;

      await child.update({
        ...(name && { name }),
        ...(nis && { nis }),
        ...(birth_date && { birth_date }),
        ...(gender && { gender }),
        ...(class_id && { class_id }),
        ...(parent_user_id !== undefined && { parent_user_id }),
        ...(notes !== undefined && { notes }),
      });

      sendSuccess(res, child, 'Data siswa diperbarui');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const child = await Child.findByPk(req.params.id);
      if (!child) {
        sendError(res, 'Siswa tidak ditemukan', 404);
        return;
      }

      const obsCount = await Observation.count({ where: { child_id: child.id } });
      if (obsCount > 0) {
        sendError(res, 'Siswa tidak dapat dihapus karena memiliki data observasi', 400);
        return;
      }

      await child.destroy();
      sendSuccess(res, null, 'Siswa berhasil dihapus');
    } catch (err) {
      next(err);
    }
  }
}

export const childController = new ChildController();
