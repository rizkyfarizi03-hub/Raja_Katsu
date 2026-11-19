import Joi from 'joi';

const date = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
  'string.pattern.base': 'Tanggal harus berformat YYYY-MM-DD.',
});

export const PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer'];

export const idParam = Joi.object({ id: Joi.number().integer().positive().required() });

export const loginSchema = Joi.object({
  username: Joi.string().trim().required().messages({ 'any.required': 'Username wajib diisi.', 'string.empty': 'Username wajib diisi.' }),
  password: Joi.string().required().messages({ 'any.required': 'Password wajib diisi.', 'string.empty': 'Password wajib diisi.' }),
});

export const productSchema = Joi.object({
  name: Joi.string().trim().max(100).required().messages({ 'any.required': 'Nama produk wajib diisi.', 'string.empty': 'Nama produk wajib diisi.' }),
  category: Joi.string().trim().max(50).required().messages({ 'any.required': 'Kategori wajib diisi.', 'string.empty': 'Kategori wajib diisi.' }),
  unit_price: Joi.number().integer().min(0).required().messages({ 'any.required': 'Harga jual wajib diisi.', 'number.base': 'Harga jual harus berupa angka.', 'number.min': 'Harga jual tidak boleh negatif.' }),
  unit_cost: Joi.number().integer().min(0).required().messages({ 'any.required': 'Modal wajib diisi.', 'number.base': 'Modal harus berupa angka.', 'number.min': 'Modal tidak boleh negatif.' }),
  is_active: Joi.boolean(),
  // Foto: tidak dikirim = tidak diubah, null = hapus foto, data URL = ganti foto
  photo: Joi.string().pattern(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).max(700000).allow(null, '').messages({
    'string.pattern.base': 'Foto harus berupa gambar JPG, PNG, atau WebP.',
    'string.max': 'Ukuran foto terlalu besar.',
  }),
});

export const productQuery = Joi.object({
  all: Joi.boolean().default(false),
});

const time = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).messages({
  'string.pattern.base': 'Jam harus berformat HH:MM.',
});

export const orderSchema = Joi.object({
  date: date.optional(),
  time: time.optional(),
  cash_received: Joi.number().integer().min(0).max(100000000).allow(null).messages({
    'number.base': 'Uang diterima harus berupa angka.',
    'number.min': 'Uang diterima tidak boleh negatif.',
  }),
  payment_method: Joi.string().valid(...PAYMENT_METHODS).required().messages({
    'any.only': 'Cara bayar harus Cash, QRIS, atau Transfer.',
    'any.required': 'Cara bayar wajib dipilih.',
  }),
  items: Joi.array().min(1).max(50).required().items(
    Joi.object({
      product_id: Joi.number().integer().positive().required().messages({ 'any.required': 'Produk wajib dipilih.' }),
      units_sold: Joi.number().integer().min(1).max(10000).required().messages({
        'any.required': 'Jumlah wajib diisi.',
        'number.base': 'Jumlah harus berupa angka.',
        'number.min': 'Jumlah minimal 1.',
      }),
    })
  ).messages({ 'array.min': 'Pilih minimal satu produk.', 'any.required': 'Pilih minimal satu produk.' }),
});

const range = { from: date, to: date };

export const orderQuery = Joi.object({
  ...range,
  payment_method: Joi.string().valid(...PAYMENT_METHODS),
  status: Joi.string().valid('aktif', 'batal').default('aktif'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const voidSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(200).required().messages({
    'any.required': 'Alasan pembatalan wajib diisi.',
    'string.empty': 'Alasan pembatalan wajib diisi.',
    'string.min': 'Alasan pembatalan minimal 3 huruf.',
    'string.max': 'Alasan pembatalan maksimal 200 huruf.',
  }),
});

export const orderCodeParam = Joi.object({
  code: Joi.string().pattern(/^[A-Za-z0-9-]{3,20}$/).required(),
});

const username = Joi.string().trim().lowercase().pattern(/^[a-z0-9._-]{3,30}$/).required().messages({
  'string.pattern.base': 'Nama pengguna 3-30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.',
  'any.required': 'Nama pengguna wajib diisi.',
  'string.empty': 'Nama pengguna wajib diisi.',
});
const personName = Joi.string().trim().max(100).required().messages({ 'any.required': 'Nama wajib diisi.', 'string.empty': 'Nama wajib diisi.' });
const role = Joi.string().valid('admin', 'kasir').required().messages({ 'any.only': 'Peran harus admin atau kasir.', 'any.required': 'Peran wajib dipilih.' });
const pwMsg = { 'string.min': 'Kata sandi minimal 8 karakter.', 'string.empty': 'Kata sandi wajib diisi.', 'any.required': 'Kata sandi wajib diisi.' };

export const userCreateSchema = Joi.object({
  name: personName,
  username,
  password: Joi.string().min(8).max(72).required().messages(pwMsg),
  role,
});

// password boleh dikosongkan kalau tidak diganti
export const userUpdateSchema = Joi.object({
  name: personName,
  username,
  password: Joi.string().min(8).max(72).allow('', null).messages(pwMsg),
  role,
  is_active: Joi.boolean().required(),
});

export const transactionQuery = Joi.object({
  ...range,
  product_id: Joi.number().integer().positive(),
  category: Joi.string().trim(),
  payment_method: Joi.string().valid(...PAYMENT_METHODS),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const rangeQuery = Joi.object(range);

export const trendQuery = Joi.object({
  ...range,
  group: Joi.string().valid('day', 'month').default('day'),
});

export const topQuery = Joi.object({
  ...range,
  limit: Joi.number().integer().min(1).max(50).default(5),
});

// Pertanyaan untuk asisten AI
export const askSchema = Joi.object({
  question: Joi.string().trim().min(2).max(500).required().messages({
    'any.required': 'Tulis pertanyaannya dulu.',
    'string.empty': 'Tulis pertanyaannya dulu.',
    'string.min': 'Pertanyaan terlalu pendek.',
    'string.max': 'Pertanyaan maksimal 500 huruf.',
  }),
});
