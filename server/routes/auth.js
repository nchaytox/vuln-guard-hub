import express from 'express';
import { login, register, me, updateMe } from '../authController.js';
import { validateBody, loginSchema, registerSchema, profileUpdateSchema } from '../validators.js';
import auth from '../authMiddleware.js';

const router = express.Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/register', validateBody(registerSchema), register);
router.get('/me', auth, me);
router.patch('/me', auth, validateBody(profileUpdateSchema), updateMe);

export default router;
