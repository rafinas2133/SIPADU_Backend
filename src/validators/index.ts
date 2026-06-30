import { body, param, query } from 'express-validator';

const likertScore = (field: string, label: string) =>
  body(field)
    .isInt({ min: 1, max: 4 })
    .withMessage(`${label} harus bilangan bulat antara 1 dan 4`);

export const loginValidator = [
  body('email').isEmail().withMessage('Format email tidak valid'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
];

export const refreshTokenValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token wajib diisi'),
];

export const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Format email tidak valid'),
];

export const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Token reset wajib diisi'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password minimal 8 karakter')
    .matches(/[A-Z]/)
    .withMessage('Password harus mengandung huruf besar')
    .matches(/[0-9]/)
    .withMessage('Password harus mengandung angka'),
];

export const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Nama wajib diisi'),
  body('email').isEmail().withMessage('Format email tidak valid'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password minimal 8 karakter'),
  body('role')
    .isIn(['admin', 'guru', 'orang_tua'])
    .withMessage('Role harus admin, guru, atau orang_tua'),
];

export const updateUserValidator = [
  param('id').isUUID().withMessage('ID user tidak valid'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['admin', 'guru', 'orang_tua']),
];

export const createClassValidator = [
  body('name').trim().notEmpty().withMessage('Nama kelas wajib diisi'),
  body('teacher_id').isUUID().withMessage('ID guru tidak valid'),
  body('academic_year').optional().trim(),
];

export const createChildValidator = [
  body('name').trim().notEmpty().withMessage('Nama siswa wajib diisi'),
  body('nis').trim().notEmpty().withMessage('NIS wajib diisi'),
  body('birth_date').isISO8601().withMessage('Format tanggal lahir tidak valid'),
  body('gender').isIn(['L', 'P']).withMessage('Jenis kelamin harus L atau P'),
  body('class_id').isUUID().withMessage('ID kelas tidak valid'),
  body('parent_user_id').optional().isUUID(),
];

export const createObservationValidator = [
  body('child_id').isUUID().withMessage('ID siswa tidak valid'),
  body('observation_date').isISO8601().withMessage('Format tanggal observasi tidak valid'),
  likertScore('bahasa', 'Bahasa'),
  likertScore('motorik_halus', 'Motorik Halus'),
  likertScore('motorik_kasar', 'Motorik Kasar'),
  likertScore('kognitif', 'Kognitif'),
  likertScore('sosial_emosional', 'Sosial Emosional'),
  body('status').optional().isIn(['draft', 'final']),
  body('note').optional().isString(),
];

export const retrainValidator = [
  body('parameters').optional().isObject(),
];

export const uuidParam = (name: string) =>
  param(name).isUUID().withMessage(`${name} tidak valid`);

export const paginationQuery = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];
