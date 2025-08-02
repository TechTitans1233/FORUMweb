import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import 'dotenv/config';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

let firebaseApp;
if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApps()[0];
}
const auth = getAuth(firebaseApp);


const router = Router();

// Rota para login regular (agora gerando seu próprio JWT)
router.post('/', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios!' }); // 400 Bad Request
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log(user)

        // Gera o token de autenticação com expiração de x
        const token = jwt.sign({ uid: user.uid, email: user.email, name: user.displayName}, process.env.SECRET_KEY, { expiresIn: '15m' });
        //localStorage.setItem("userToken", token);
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 15 * 60 * 1000, // Expira em x
        });

        return res.status(200).json({
            message: 'Usuário autenticado com sucesso!',
            user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao autenticar usuário.', error: error.message }); // 500 Internal Server Error
    }
});

export default router;