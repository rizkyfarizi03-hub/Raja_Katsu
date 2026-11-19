import { AppError } from './error.js';

// validate(schema, 'body' | 'query' | 'params')
export const validate = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source], { abortEarly: false, stripUnknown: true, convert: true });
  if (error) {
    const errors = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return next(new AppError(400, 'Data yang dikirim belum sesuai.', errors));
  }
  if (source === 'query') req.validQuery = value;
  else req[source] = value;
  next();
};
