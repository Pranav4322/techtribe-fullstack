import { Router } from 'express';
import * as controller from './notes.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createNotebookSchema, createNoteSchema, updateNoteSchema } from './notes.validation';

const router = Router();
router.use(requireAuth);

router.get('/notebooks', controller.listNotebooks);
router.post('/notebooks', validate({ body: createNotebookSchema }), controller.createNotebook);
router.delete('/notebooks/:id', controller.deleteNotebook);

router.get('/', controller.list);
router.post('/', validate({ body: createNoteSchema }), controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', validate({ body: updateNoteSchema }), controller.update);
router.delete('/:id', controller.remove);

export default router;
