const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTION = [
  'Eres un redactor técnico de soporte TI enfocado en la precisión y concisión.',
  'Tu tarea es corregir ortografía, gramática y estructurar el texto usando vocabulario técnico profesional de TI.',
  'REGLAS DE FIDELIDAD Y LONGITUD:',
  '1. Estricta fidelidad: NO inventes ni agregues procedimientos, pruebas o diagnósticos que no estén explícitamente mencionados en el texto original.',
  '2. Concisión estricta: Limítate a entre 20 y 45 palabras por sección. Sé directo y elimina palabras de relleno o introducciones innecesarias.',
  '3. Mantén el tono neutro, formal y técnico adecuado para el área de tecnología.',
  '4. Responde ÚNICAMENTE con el texto corregido. Sin saludos, introducciones, ni nombres de sección.',
].join(' ');

const MODELOS = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-2.0-flash'];

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

function esError404(err) {
  const status = Number(err?.status ?? err?.code);
  if (status === 404) return true;
  return /not found|404|NOT_FOUND/i.test(String(err?.message || ''));
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

function idModelo(raw) {
  return String(raw || '').replace(/^models\//, '').trim();
}

async function listarNombresFlash(ai) {
  const nombres = [];
  try {
    const listed = await ai.models.list({ config: { pageSize: 80 } });
    const items = [];
    if (listed && typeof listed[Symbol.asyncIterator] === 'function') {
      for await (const m of listed) items.push(m);
    } else if (Array.isArray(listed)) {
      items.push(...listed);
    } else if (Array.isArray(listed?.page)) {
      items.push(...listed.page);
    } else if (Array.isArray(listed?.models)) {
      items.push(...listed.models);
    }

    for (const m of items) {
      const id = idModelo(m?.name || m?.baseModelId || '');
      const methods = m?.supportedActions || m?.supportedGenerationMethods || [];
      const okGen = !methods.length
        || methods.includes('generateContent')
        || methods.includes('generate_content');
      if (okGen && /flash/i.test(id) && !/embed|tts|image|live/i.test(id)) {
        nombres.push(id);
      }
    }
  } catch (err) {
    console.error('Error en Gemini API:', err.message, err.status);
  }
  console.error('Modelos flash listados:', nombres.slice(0, 20).join(', ') || '(ninguno)');
  return nombres;
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
  if (String(model).startsWith('gemini-3')) {
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
  const intentados = new Set();
  let todos404 = true;

  async function intentarModelos(lista) {
    for (const model of lista) {
      const id = idModelo(model);
      if (!id || intentados.has(id)) continue;
      intentados.add(id);
      try {
        const texto = await generarTexto(ai, id, contexto, borrador);
        if (texto) {
          return texto;
        }
        ultimoError = new Error('empty');
        todos404 = false;
      } catch (err) {
        ultimoError = err;
        console.error('Error en Gemini API:', err.message, err.status);
        if (!esError404(err)) todos404 = false;
        if (debeSaltarModelo(err)) {
          continue;
        }
        await esperar(1000);
      }
    }
    return null;
  }

  let texto = await intentarModelos(MODELOS);

  if (!texto && todos404) {
    const extras = await listarNombresFlash(ai);
    texto = await intentarModelos(extras);
  }

  if (texto) {
    return res.json({ texto });
  }

  if (ultimoError && ultimoError.message === 'empty') {
    return res.status(502).json({ error: 'La IA no devolvió texto. Intenta de nuevo.' });
  }

  if (esError404(ultimoError) || todos404) {
    return res.status(404).json({
      error: 'El modelo configurado no está disponible en la API.',
    });
  }

  console.error('Error en Gemini API:', ultimoError?.message, ultimoError?.status);
  return res.status(502).json({
    error: mensajeUsuario(ultimoError),
  });
};
