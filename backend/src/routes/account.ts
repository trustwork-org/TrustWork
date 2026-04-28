import { Router } from 'express';
import { registerAccount, getAccount } from '../controllers/accountController';
import { validate, registerAccountSchema } from '../middleware/validate';

const router = Router();

router.post('/register', validate(registerAccountSchema), registerAccount);
router.get('/:address', getAccount);

export default router;
