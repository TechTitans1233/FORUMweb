/*import { supabase } from '../services/supabase.js'

export async function uploadImage(req, res) {
    const file = req.file;
    const { data, error } = await supabase
        .storage
        .from('images')
        .upload(`public/${file.originalname}`, file.buffer);

    if (error) return res.status(500).send(error.message);

    const { data: urlData } = supabase
        .storage
        .from('images')
        .getPublicUrl(`public/${file.originalname}`);

    res.json({ url: urlData.publicUrl });
}*/
import { supabase } from '../services/supabase.js'

export async function uploadImage(req, res) {
    const file = req.file;
    const fileName = `${Date.now()}_${file.originalname}`; // Garante nome único
    const filePath = `public/${fileName}`; // Caminho onde a imagem será salva

    // Upload da imagem
    const { data, error } = await supabase
        .storage
        .from('images')
        .upload(filePath, file.buffer);

    if (error) return res.status(500).send(error.message);

    // Gerar URL assinada (válida por 1 hora)
    const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('images')
        .createSignedUrl(filePath, 3600); // 3600 segundos = 1 hora

    if (signedUrlError) return res.status(500).send(signedUrlError.message);

    res.json({ signedUrl: signedUrlData.signedUrl });
}
