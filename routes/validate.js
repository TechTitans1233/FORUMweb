import { Router } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const router = Router();

/*
router.get('/', async (req, res) => {
    res.status(200).send('IAE');
});*/

router.use(cookieParser());
// Rota protegida para validar token
router.post('/', async (req, res, next) => {
    //res.status(200).json({ message: 'Token válido.', user: req.user });
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    /*if (revokedTokens.includes(token)) {
        return res.status(403).json({ message: 'Token revogado. Faça login novamente.' });
    }*/

    jwt.verify(token, 'secreta', (err, decoded) => {
        if (err) {
            console.log('Erro ao verificar token:', err.message);
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = decoded;
        next();
    });
    return res.status(200).json({ token: token, message: 'Token válido.' });
});

export default router;