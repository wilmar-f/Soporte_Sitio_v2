const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTION = [
  'Actúas como especialista de soporte TI senior.',
  'Corrige totalmente ortografía, tildes, puntuación y mayúsculas.',
  'Usa lenguaje técnico impecable, neutro y coherente.',
  'No agregues introducciones ni saludos: entrega únicamente el texto procesado.',
].join(' ');

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generarTexto(ai, contexto, borrador) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: contexto
      ? `Sección: ${contexto}\n\nBorrador del técnico:\n${borrador}`
      : borrador,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });
  return String(response.text || '').trim();
}

exports.redactar = async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta GEMINI_API_KEY en el servidor.' });
  }

  const contexto = String(req.body?.contexto || '').trim();
  const borrador = String(req.body?.borrador || '').trim();
  if (!borrador) {
    return res.status(400).json({ error: 'El borrador no puede estar vacío.' });
  }

  const ai = getClient();
  let ultimoError = null;

  for (let intento = 1; intento <= 2; intento += 1) {
    try {
      const texto = await generarTexto(ai, contexto, borrador);
      if (texto) {
        return res.json({ texto });
      }
      ultimoError = new Error('empty');
    } catch (err) {
      ultimoError = err;
    }

    if (intento === 1) {
      await esperar(1000);
    }
  }

  if (ultimoError && ultimoError.message === 'empty') {
    return res.status(502).json({ error: 'La IA no devolvió texto. Intenta de nuevo.' });
  }

  console.error('Error en /api/redactar:', ultimoError?.message || ultimoError);
  return res.status(502).json({
    error: 'No se pudo redactar el texto. Intenta de nuevo.',
  });
};
