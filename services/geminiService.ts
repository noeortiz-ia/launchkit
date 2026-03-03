import { ContentItem, ContentStatus, Project, WeekPhase, LaunchKitType, AIConfig } from "../types";

// Note: GoogleGenAI SDK removed in favor of OpenRouter centralisation.

// Error Translation Helper
export const translateAIError = (error: any): string => {
    const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
    
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('rate-limited')) {
        return "⚠️ El servicio está saturado (límite de cuota). Por favor, intenta de nuevo en unos minutos o usa un modelo gratuito.";
    }
    if (errorStr.includes('401') || errorStr.includes('API_KEY_INVALID')) {
        return "🔑 Error de autenticación: Verifica las claves API en la configuración.";
    }
    if (errorStr.includes('404')) {
        return "🚫 Modelo no encontrado. Verifica si el modelo seleccionado está disponible.";
    }
    
    return "❌ Error en el servicio de IA. Por favor, intenta de nuevo.";
};

// OpenRouter Helper
const callOpenRouter = async (messages: any[], apiKey: string, model: string, jsonMode: boolean = false) => {
    if (!apiKey) throw new Error("Missing OpenRouter API Key in configuration");

    const body: any = {
        model,
        messages,
        site_url: "http://localhost:5173", // Optional for OpenRouter rankings
        site_name: "LaunchKit",
    };
    if (jsonMode) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173", // Required for free tier sometimes
            "X-Title": "LaunchKit"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("OpenRouter Error:", err);
        throw new Error(translateAIError(err));
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Cleanup markdown if strictly needing JSON
    if (jsonMode) {
        content = content.replace(/```json\n?|```/g, "").trim();
    }
    return content;
}

// 1. Extract PRD
export const extractPRD = async (prdText: string, config: AIConfig) => {
  const prompt = `Analiza el siguiente texto (PRD o descripción de producto) y extrae la información estructurada en JSON.
  Responde SIEMPRE en español.
  Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
  {
      "name": "Nombre del producto",
      "description": "Descripción corta",
      "targetAudience": "Público objetivo",
      "problemSolved": "Problema que resuelve"
  }
  
  Texto: "${prdText}"`;

  try {
    const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, true);
    return JSON.parse(jsonStr || "{}");
  } catch (e) {
      console.error("Error extracting PRD", e);
      return {};
  }
};

// 2. Generate Monthly Plan with Grounding & Thinking
export const generateMonthlyPlan = async (project: Project, useSearch: boolean = true, config: AIConfig): Promise<ContentItem[]> => {
  const model = useSearch ? "google/gemini-3.1-pro-preview" : config.textModel;
  
  const prompt = `Actúa como LaunchKit, un estratega de contenido experto. Genera un plan de contenido mensual (4 semanas) para el siguiente producto:
  
  Nombre: ${project.name}
  Descripción: ${project.description}
  Audiencia: ${project.targetAudience}
  Problema que resuelve: ${project.problemSolved}

  ${useSearch ? 'Usa tus capacidades de búsqueda web para encontrar tendencias ACTUALES que sean relevantes para este producto o su industria. Si encuentras una tendencia relevante, marca el contenido como "isTrend": true e incluye el contexto en "trendContext".' : 'NO busques noticias recientes. Céntrate en pilares de contenido sólidos y estratégicos (Evergreen).'}
  
  Estructura del plan (4 semanas, EXACTAMENTE 5 ideas por semana):
  - Semana 1 (5 ideas variadas)
  - Semana 2 (5 ideas variadas)
  - Semana 3 (5 ideas variadas)
  - Semana 4 (5 ideas variadas)

  Genera un total de 20 items. 
  
  Tipos de contenido permitidos ÚNICAMENTE:
  - "Post X"
  - "Post LinkedIn"
  - "Post Instagram"
  - "Email"
  
  REGLAS DE DISTRIBUCIÓN (IMPORTANTE):
  1. MEZCLA los tipos de contenido en TODAS las semanas de forma aleatoria y equilibrada.
  2. NO crees semanas temáticas ni sigas fases.
  3. Cada semana DEBE tener una mezcla de los 4 tipos.
  
  IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido que contenga una clave "plan" con el array de 20 objetos. Todo en español.
  Cada objeto del array debe tener:
  {
    "week": "Semana 1" | "Semana 2" | "Semana 3" | "Semana 4",
    "contentType": "Post X" | "Post LinkedIn" | "Post Instagram" | "Email",
    "title": "Título corto (max 10 palabras)",
    "angle": "El ángulo o enfoque del contenido",
    "isTrend": boolean,
    "trendContext": "Contexto de la tendencia si existe"
  }`;

  try {
    const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, model, true);
    const parsed = JSON.parse(jsonStr || "{}");
    
    let rawItems = [];
    if (parsed && Array.isArray(parsed.plan)) {
        rawItems = parsed.plan;
    } else if (parsed && Array.isArray(parsed.items)) {
        rawItems = parsed.items;
    } else if (Array.isArray(parsed)) {
        rawItems = parsed;
    }

    return rawItems.map((item: any) => ({
      week: item.week || "Semana 1",
      contentType: item.contentType || "Post X",
      title: item.title || "Sin título",
      angle: item.angle || "Sin enfoque",
      isTrend: !!item.isTrend,
      trendContext: item.trendContext || "",
      id: crypto.randomUUID(),
      status: ContentStatus.PENDING
    }));
  } catch (e: any) {
    console.error("Error creating plan with OpenRouter", e);
    throw new Error(translateAIError(e));
  }
};

// 2.5 Generate Single Idea (OpenRouter)
export const generateSingleIdea = async (project: Project, week: WeekPhase, config: AIConfig): Promise<ContentItem> => {
    const prompt = `Genera UNA (1) idea de contenido de marketing creativa y única para la: "${week}".
    
    Producto: ${project.name}
    Descripción: ${project.description}
    Target: ${project.targetAudience}
  
    Tipos permitidos: "Post X", "Post LinkedIn", "Post Instagram", "Email".
    Selecciona uno aleatoriamente.

    Responde ÚNICAMENTE con un JSON válido con esta estructura:
    {
        "contentType": "Tipo seleccionado",
        "title": "Título corto",
        "angle": "Explicación del ángulo",
        "isTrend": false,
        "trendContext": ""
    }`;
  
    try {
        const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, true);
        const item = JSON.parse(jsonStr || "{}");
        return {
            ...item,
            week: week,
            id: crypto.randomUUID(),
            status: ContentStatus.PENDING
        };
    } catch (e) {
        console.error(e);
        throw e;
    }
  };

// 3. Generate Copy (OpenRouter)
export const generateCopy = async (item: ContentItem, project: Project, config: AIConfig) => {
  const prompt = `Genera el texto FINAL listo para publicar para este contenido de marketing.
  
  Producto: ${project.name}
  Descripción: ${project.description}
  Target: ${project.targetAudience}
  
  Detalles del contenido:
  Tipo: ${item.contentType}
  Título/Idea: ${item.title}
  Ángulo: ${item.angle}
  ${item.isTrend ? `Conectado a tendencia: ${item.trendContext}` : ''}
  
  REGLAS:
  1. SOLO devuelve el texto del contenido. 
  2. PROHIBIDO usar Markdown. 
  3. NO incluyas introducciones.
  4. Si es Email: Primera línea el Asunto, salta dos líneas, y luego el cuerpo.
  5. Escribe en Español. Tono profesional pero cercano.`;

  return await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, false);
};

// 4. Refine Copy (OpenRouter)
export const refineCopy = async (currentCopy: string, instruction: string, config: AIConfig) => {
  const prompt = `Reescribe el siguiente texto aplicando la instrucción dada.
  
  Texto original:
  "${currentCopy}"
  
  Instrucción:
  "${instruction}"
  
  REGLAS:
  1. Devuelve SOLAMENTE el texto reescrito en español.
  2. PROHIBIDO usar Markdown.
  3. Sin explicaciones.`;

  return await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, false);
};

// 5. Generate Image (OpenRouter Flux 2)
export const generateImage = async (item: ContentItem, project: Project, aspectRatio: string, config: AIConfig) => {
  const prompt = `Attractive marketing image for a project named "${project.name}". 
  Context: ${item.title}. Angle: ${item.angle}. 
  Aspect Ratio: ${aspectRatio}`; 

  const API_KEY = config.apiKey;
  if (!API_KEY) {
      console.error("Missing OpenRouter API Key");
      return null;
  }

  try {
      console.log("[geminiService] Fetching OpenRouter for image...");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "LaunchKit"
        },
        body: JSON.stringify({
          model: config.imageModel,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          modalities: ["image"] 
        })
      });

      console.log("[geminiService] OpenRouter response status:", response.status);

      if (!response.ok) {
          const errorText = await response.text();
          console.error("[geminiService] OpenRouter Error Body:", errorText);
          throw new Error(translateAIError(errorText));
      }

      const data = await response.json();
      console.log("[geminiService] OpenRouter data received.");
      const images = data.choices?.[0]?.message?.images;
      
      if (!images || images.length === 0) {
          console.error("[geminiService] No images found in response", data);
          return null;
      }

      const imageUrl = images[0].image_url?.url;
      console.log("[geminiService] Image URL extracted safely.");
      return imageUrl || null;

  } catch (error) {
    console.error("[geminiService] Error generating image:", error);
    return null;
  }
};

// === LAUNCH KIT GENERATION ===

const getLaunchKitPrompt = (type: LaunchKitType, project: Project) => {
    const baseInfo = `Producto: ${project.name}. Descripción: ${project.description}. Target: ${project.targetAudience}.`;
    
    switch (type) {
        case 'emails':
            return `Genera 3 emails de marketing para el lanzamiento. ${baseInfo}
            Escribe asunto y cuerpo.
            Responde ÚNICAMENTE con JSON:
            { "teaser": "texto", "lanzamiento": "texto", "recordatorio": "texto" }`;
        case 'productHunt':
            return `Genera textos para Product Hunt. ${baseInfo}
            Responde ÚNICAMENTE con JSON:
            { "tagline": "texto max 60 chars", "descripcion": "texto intro", "primerComentario": "texto comentario" }`;
        case 'directories':
            return `Genera descripciones para directorios. ${baseInfo}
            Responde ÚNICAMENTE con JSON:
            { "descripcionCorta": "texto", "descripcionLarga": "texto" }`;
    }
};

export const generateLaunchKitContent = async (type: LaunchKitType, project: Project, config: AIConfig) => {
    const prompt = getLaunchKitPrompt(type, project);
    try {
        const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, true);
        return JSON.parse(jsonStr || "{}");
    } catch(e) {
        console.error(e);
        return {};
    }
};

export const refineLaunchKitContent = async (type: LaunchKitType, currentContent: any, instruction: string, config: AIConfig) => {
    const prompt = `Reescribe los siguientes textos aplicando esta instrucción: "${instruction}".
    
    Contenido actual:
    ${JSON.stringify(currentContent)}
    
    Mantén la estructura JSON exacta. Solo modifica los textos.`;

    try {
        const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, true);
        return JSON.parse(jsonStr || "{}");
    } catch(e) {
        console.error(e);
        return {};
    }
};