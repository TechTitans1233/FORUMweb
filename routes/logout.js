import { Router } from 'express';
const router = Router();

// Rota para logout
router.get('/', async (req, res) => {
    if (!req.cookies) {
        return res.redirect('/login');
    }

    //console.log(req.cookies);
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    });
    res.clearCookie("adminToken", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    });
    req.session.destroy();
    //res.json({ message: "Logout realizado com sucesso" });
    return res.redirect('/login');
    //return res.status(200).json({ message: 'Logout realizado com sucesso.' });
});

export default router;