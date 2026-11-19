export class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// Bungkus handler async supaya error-nya sampai ke errorHandler.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) =>
  res.status(404).json({ status: 'error', message: 'Alamat API tidak ditemukan.' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ status: 'error', message: err.message, errors: err.errors });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ status: 'error', message: 'Data yang dikirim terlalu besar. Coba foto yang lebih kecil.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', message: 'Format data yang dikirim tidak valid.' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ status: 'error', message: 'Produk dengan nama tersebut sudah ada.' });
  }
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server. Coba lagi sebentar lagi.' });
};
