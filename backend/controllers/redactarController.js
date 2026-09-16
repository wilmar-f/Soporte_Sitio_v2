const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTION = [
  'Actúas como especialista de soporte TI senior.',
  'Corrige totalmente ortografía, tildes, puntuación y mayúsculas.',
  'Usa lenguaje técnico impecable, neutro y coherente.',
  'No agregues introducciones ni saludos: entrega únicamente el texto procesado.',
  'No copies títulos, nombres de sección ni la palabra Sección.',
].join(' ');

const MODELOS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function limpiarTextoIA(texto, contexto) {
  let t = String(texto || '').trim();
  t = t.replace(/^Sección:\s*[^\n]+\s*/i, '').trim();
  t = t.replace(/^Borrador del técnico:\s*/i, '').trim();
  if (contexto) {
    const esc = contexto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`^${esc}\\s*`, 'i'), '').trim();
  }
  return t;
}

function extraerTexto(response) {
  try {
    const directo = String(response?.text || '').trim();
    if (directo) return directo;
  } catch (_err) {
    // response.text puede lanzar si hay thought parts
  }

  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part) => part && !part.thought && part.text)
    .map((part) => String(part.text))
    .join('\n')
    .trim();
}

function debeSaltarModelo(err) {
  const status = Number(err?.status ?? err?.code);
  if (status === 404 || status === 429 || status === 503 || status === 504) return true;
  return /not found|404|RESOURCE_EXHAUSTED|quota|429|UNAVAILABLE|DEADLINE|timeout|503|504/i.test(
    String(err?.message || ''),
  );
}

function mensajeUsuario(err) {
  const status = Number(err?.status ?? err?.code);
  const msg = String(err?.message || '');
  if (status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return 'Se agotó la cuota gratuita de la IA por ahora. Espera unos minutos (o hasta el día siguiente si el límite diario se llenó) e intenta de nuevo.';
  }
  if (status === 503 || status === 504 || /UNAVAILABLE|DEADLINE/i.test(msg)) {
    return 'La IA está saturada en este momento. Espera un minuto e intenta de nuevo.';
  }
  return 'No se pudo redactar el texto. Intenta de nuevo.';
}

async function generarTexto(ai, model, contexto, borrador) {
  const instruction = contexto
    ? `${SYSTEM_INSTRUCTION} El borrador corresponde a «${contexto}»; no incluyas ese título en la respuesta.`
    : SYSTEM_INSTRUCTION;

  const config = {
    systemInstruction: instruction,
    temperature: 0.2,
    httpOptions: { timeout: 20000 },
  };
  if (model.startsWith('gemini-3')) {
    config.thinkingConfig = { thinkingLevel: 'minimal' };
  }

  const response = await ai.models.generateContent({
    model,
    contents: borrador,
    config,
  });
  return limpiarTextoIA(extraerTexto(response), contexto);
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

  for (const model of MODELOS) {
    try {
      const texto = await generarTexto(ai, model, contexto, borrador);
      if (texto) {
        return res.json({ texto });
      }
      ultimoError = new Error('empty');
    } catch (err) {
      ultimoError = err;
      if (debeSaltarModelo(err)) {
        continue;
      }
      await esperar(1000);
    }
  }

  if (ultimoError && ultimoError.message === 'empty') {
    return res.status(502).json({ error: 'La IA no devolvió texto. Intenta de nuevo.' });
  }

  console.error('Error en /api/redactar:', ultimoError?.status ?? ultimoError?.code ?? ultimoError?.message);
  return res.status(502).json({
    error: mensajeUsuario(ultimoError),
  });
};
