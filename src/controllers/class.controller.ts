import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Class, Child, User, Observation } from '../models';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export class ClassController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const academicYear = req.query.academic_year as string;
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = {};

      if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
      }
      if (academicYear) {
        where.academic_year = academicYear;
      }
      // Guru hanya melihat kelas yang diajarnya
      if (req.user?.role === 'guru') {
        where.teacher_id = req.user.userId;
      }

      const { count, rows } = await Class.findAndCountAll({
        where,
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        ],
        limit,
        offset,
        order: [['name', 'ASC']],
      });

      // Tambah jumlah siswa per kelas
      const enriched = await Promise.all(
        rows.map(async (kelas) => {
          const studentCount = await Child.count({ where: { class_id: kelas.id } });
          return { ...kelas.toJSON(), student_count: studentCount };
        })
      );

      const meta = { total: count, page, limit, totalPages: Math.ceil(count / limit) };
      sendSuccess(res, enriched, 'Data kelas berhasil diambil', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kelas = await Class.findByPk(req.params.id, {
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          {
            model: Child,
            as: 'children',
            attributes: ['id', 'name', 'nis', 'gender', 'birth_date'],
            include: [
              {
                model: Observation,
                as: 'observations',
                limit: 1,
                order: [['observation_date', 'DESC']],
              },
            ],
          },
        ],
      });

      if (!kelas) {
        sendError(res, 'Kelas tidak ditemukan', 404);
        return;
      }

      sendSuccess(res, kelas);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, teacher_id, academic_year, description } = req.body;

      // Cek apakah guru ada dan berperan sebagai guru
      const teacher = await User.findOne({ where: { id: teacher_id, role: 'guru', is_active: true } });
      if (!teacher) {
        sendError(res, 'Guru tidak ditemukan atau tidak aktif', 404);
        return;
      }

      const existing = await Class.findOne({ where: { name, academic_year: academic_year || '2025/2026' } });
      if (existing) {
        sendError(res, `Kelas "${name}" sudah ada di tahun ajaran ${academic_year}`, 409);
        return;
      }

      const kelas = await Class.create({ name, teacher_id, academic_year, description });
      const result = await Class.findByPk(kelas.id, {
        include: [{ model: User, as: 'teacher', attributes: ['id', 'name'] }],
      });

      sendCreated(res, result, 'Kelas berhasil dibuat');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kelas = await Class.findByPk(req.params.id);
      if (!kelas) {
        sendError(res, 'Kelas tidak ditemukan', 404);
        return;
      }

      const { name, teacher_id, academic_year, description } = req.body;

      if (teacher_id) {
        const teacher = await User.findOne({ where: { id: teacher_id, role: 'guru', is_active: true } });
        if (!teacher) {
          sendError(res, 'Guru tidak ditemukan atau tidak aktif', 404);
          return;
        }
      }

      await kelas.update({
        ...(name && { name }),
        ...(teacher_id && { teacher_id }),
        ...(academic_year && { academic_year }),
        ...(description !== undefined && { description }),
      });

      const result = await Class.findByPk(kelas.id, {
        include: [{ model: User, as: 'teacher', attributes: ['id', 'name'] }],
      });

      sendSuccess(res, result, 'Kelas berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kelas = await Class.findByPk(req.params.id);
      if (!kelas) {
        sendError(res, 'Kelas tidak ditemukan', 404);
        return;
      }

      const childCount = await Child.count({ where: { class_id: kelas.id } });
      if (childCount > 0) {
        sendError(res, `Kelas tidak dapat dihapus karena masih memiliki ${childCount} siswa`, 400);
        return;
      }

      await kelas.destroy();
      sendSuccess(res, null, 'Kelas berhasil dihapus');
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kelas = await Class.findByPk(req.params.id);
      if (!kelas) {
        sendError(res, 'Kelas tidak ditemukan', 404);
        return;
      }

      const children = await Child.findAll({ where: { class_id: kelas.id } });
      const childIds = children.map((c) => c.id);

      const totalObservations = await Observation.count({
        where: { child_id: childIds, status: 'final' },
      });

      const observedChildIds =
        childIds.length > 0
          ? (
              await Observation.findAll({
                attributes: ['child_id'],
                where: { child_id: childIds, status: 'final' },
                group: ['child_id'],
              })
            ).map((o) => o.child_id)
          : [];

      const unprocessed = childIds.length - observedChildIds.length;

      sendSuccess(res, {
        class: { id: kelas.id, name: kelas.name, academic_year: kelas.academic_year },
        total_students: children.length,
        total_observations: totalObservations,
        unprocessed_students: unprocessed,
        observed_percentage: children.length > 0
          ? Math.round(((children.length - unprocessed) / children.length) * 100)
          : 0,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const classController = new ClassController();
