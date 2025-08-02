import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/imageController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() }); // memória (sem salvar em disco)

router.post('/upload', upload.single('image'), uploadImage);

export default router;
