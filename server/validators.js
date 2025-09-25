import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'username requis').max(100),
  password: z.string().min(6, 'mot de passe trop court').max(200),
});

export const registerSchema = z.object({
  username: z.string().trim().min(1, 'username requis').max(100),
  password: z.string().min(6, 'mot de passe trop court').max(200),
});

export const scanSchema = z.object({
  repoUrl: z.string().url('repoUrl doit être une URL https://github.com/owner/repo'),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message);
      return res.status(400).json({ error: 'Invalid request', details });
    }
    req.body = parsed.data;
    next();
  };
}

// Allow clearing optional fields by accepting null or empty string (coerced to null)
const emptyToNull = (schema) => z.preprocess((v) => (v === '' ? null : v), schema);

export const profileUpdateSchema = z.object({
  // Accept valid email or null (to clear). Empty string becomes null.
  email: emptyToNull(z.union([z.string().email(), z.null()])).optional(),
  // Accept non-empty string or null (to clear). Empty string becomes null.
  displayName: emptyToNull(z.union([z.string().trim().min(1).max(100), z.null()])).optional(),
  password: z.string().min(6).max(200).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });

//
