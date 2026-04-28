import { Router } from 'express';
import { getNonce, relay, getJobStatus } from '../controllers/relayController';
import { validate } from '../middleware/validate';
import { relaySchema } from '../middleware/validate';

const router = Router();

router.get('/nonce/:address', getNonce);
router.post('/', validate(relaySchema), relay);
router.get('/job/:id', getJobStatus);

export default router;
