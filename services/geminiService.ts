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

// Robust JSON Extraction
const extractJSON = (text: string): string => {
    try {
        // Try to find the first '{' and the last '}'
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1);
        }
        return text;
    } catch (e) {
        return text;
    }
};

// OpenRouter Helper
const callOpenRouter = async (messages: any[], apiKey: string, model: string, jsonMode: boolean = false) => {
    if (!apiKey) throw new Error("Missing OpenRouter API Key in configuration");

    const body: any = {
        model,
        messages,
        site_url: "https://launchkit-jade.vercel.app", // Updated site URL
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
            "HTTP-Referer": "https://launchkit-jade.vercel.app",
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
    
    // Cleanup markdown and extract JSON if strictly needing JSON
    if (jsonMode) {
        content = content.replace(/```json\n?|```/g, "").trim();
        content = extractJSON(content);
    }
    return content;
}

// 1. Extract PRD
export const extractPRD = async (prdText: string, config: AIConfig, language: string = 'es') => {
  const isEn = language === 'en';
  const prompt = `Analyze the following text (PRD or product description) and extract structured information in JSON.
  Response language: ${isEn ? 'English' : 'Spanish'}.
  Respond ONLY with a valid JSON object with this structure:
  {
      "name": "Product name",
      "description": "Short description",
      "targetAudience": "Target audience",
      "problemSolved": "Problem solved"
  }
  
  Text: "${prdText}"`;

  try {
    const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, true);
    return JSON.parse(jsonStr || "{}");
  } catch (e) {
      console.error("Error extracting PRD", e);
      return {};
  }
};

// 2. Generate Monthly Plan with Grounding & Thinking
export const generateMonthlyPlan = async (project: Project, useSearch: boolean = true, config: AIConfig, language: string = 'es'): Promise<ContentItem[]> => {
  const model = useSearch ? "google/gemini-3.1-pro-preview" : config.textModel;
  const isEn = language === 'en';
  
  const prompt = `Act as LaunchKit, an expert content strategist. Generate a monthly content plan (4 weeks) for the following product:
  
  Name: ${project.name}
  Description: ${project.description}
  Audience: ${project.targetAudience}
  Problem solved: ${project.problemSolved}

  ${useSearch ? 'Use your web search capabilities to find CURRENT trends relevant to this product or its industry. If you find a relevant trend, mark the content as "isTrend": true and include context in "trendContext".' : 'DO NOT search for recent news. Focus on solid and strategic content pillars (Evergreen).'}
  
  Plan structure (4 weeks, EXACTLY 5 ideas per week):
  - Week 1 (5 varied ideas)
  - Week 2 (5 varied ideas)
  - Week 3 (5 varied ideas)
  - Week 4 (5 varied ideas)

  Generate a total of 20 items. 
  
  Allowed content types ONLY:
  - "Post X"
  - "Post LinkedIn"
  - "Post Instagram"
  - "Email"
  
  DISTRIBUTION RULES (IMPORTANT):
  1. MIX content types in ALL weeks in a balanced and random way.
  2. DO NOT create thematic weeks or follow phases.
  3. Each week MUST have a mix of the 4 types.
  
  IMPORTANT: Respond ONLY with a valid JSON object containing a "plan" key with the array of 20 objects. 
  Everything MUST be written in ${isEn ? 'ENGLISH' : 'SPANISH'}.
  Each object in the array must have:
  {
    "week": "WEEK_1" | "WEEK_2" | "WEEK_3" | "WEEK_4",
    "contentType": "Post X" | "Post LinkedIn" | "Post Instagram" | "Email",
    "title": "Short title (max 10 words)",
    "angle": "The content's angle or focus",
    "isTrend": boolean,
    "trendContext": "Context of the trend if it exists"
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
      week: item.week || "WEEK_1",
      contentType: item.contentType || "Post X",
      title: item.title || (isEn ? "No title" : "Sin título"),
      angle: item.angle || (isEn ? "No focus" : "Sin enfoque"),
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
export const generateSingleIdea = async (project: Project, week: WeekPhase, config: AIConfig, language: string = 'es'): Promise<ContentItem> => {
    const isEn = language === 'en';
    const prompt = `Generate ONE (1) creative and unique marketing content idea for: "${week}".
    
    Product: ${project.name}
    Description: ${project.description}
    Target: ${project.targetAudience}
  
    Allowed types: "Post X", "Post LinkedIn", "Post Instagram", "Email".
    Select one randomly.

    Everything MUST be written in ${isEn ? 'ENGLISH' : 'SPANISH'}.
    Respond ONLY with a valid JSON with this structure:
    {
        "contentType": "Selected type",
        "title": "Short title",
        "angle": "Angle explanation",
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
export const generateCopy = async (item: ContentItem, project: Project, config: AIConfig, language: string = 'es') => {
  const isEn = language === 'en';
  const prompt = `Generate the FINAL copy ready to publish for this marketing content.
  
  Product: ${project.name}
  Description: ${project.description}
  Target: ${project.targetAudience}
  
  Content details:
  Type: ${item.contentType}
  Title/Idea: ${item.title}
  Angle: ${item.angle}
  ${item.isTrend ? `Connected to trend: ${item.trendContext}` : ''}
  
  RULES:
  1. ONLY return the content text. 
  2. Markdown is PROHIBITED. 
  3. DO NOT include introductions.
  4. If Email: First line is the Subject, skip two lines, then the body.
  5. Write in ${isEn ? 'ENGLISH' : 'SPANISH'}. Tone: professional but friendly.`;

  return await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, false);
};

// 4. Refine Copy (OpenRouter)
export const refineCopy = async (currentCopy: string, instruction: string, config: AIConfig, language: string = 'es') => {
  const isEn = language === 'en';
  const prompt = `Rewrite the following text applying the given instruction.
  
  Original text:
  "${currentCopy}"
  
  Instruction:
  "${instruction}"
  
  RULES:
  1. Return ONLY the rewritten text in ${isEn ? 'ENGLISH' : 'SPANISH'}.
  2. Markdown is PROHIBITED.
  3. No explanations.`;

  return await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, false);
};

// 5. Generate Image (OpenRouter Flux 2)
export const generateImage = async (
    item: ContentItem, 
    project: Project, 
    aspectRatio: string = "1:1",
    config: AIConfig,
    language: string = 'es',
    options?: { includeText?: boolean; slideIndex?: number }
) => {
    const isEn = language === 'en';
    
    // Determine context for slides if it's a carousel
    let slideContext = "";
    if (options?.slideIndex !== undefined && item.copy) {
        const slideNum = options.slideIndex + 1;
        // Search for SLIDE X: or DIAPOSITIVA X: or Slide X:
        const slideRegex = new RegExp(`(?:SLIDE|DIAPOSITIVA)\\s*${slideNum}:?\\s*([\\s\\S]*?)(?=(?:SLIDE|DIAPOSITIVA)\\s*${slideNum + 1}|POST CAPTION|$)`, 'i');
        const match = item.copy.match(slideRegex);
        if (match && match[1]) {
            slideContext = `THIS IMAGE IS SPECIFICALLY FOR SLIDE #${slideNum}. Focus on this content: "${match[1].trim()}". `;
        }
    }

    const prompt = `Attractive and premium social media marketing image.
Product: "${project.name}"
Title: ${item.title}
Angle: ${item.angle}
${slideContext ? `SPECIFIC SLIDE CONTENT: ${slideContext}` : `Full Post Context: ${item.copy}`}

Instructions:
- Style: Modern, clean, professional, high-density.
- Target: ${project.targetAudience}
- Aspect Ratio: ${aspectRatio}
${options?.includeText === false ? "- IMPORTANT: DO NOT include any text, letters, or words in the image. Pure visual representation only." : `- Any text in the image must be in ${isEn ? 'ENGLISH' : 'SPANISH'}.`}
- Use vibrant but professional colors. Avoid generic stock photos.`;

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
          "HTTP-Referer": "https://launchkit-jade.vercel.app",
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

const getLaunchKitPrompt = (type: LaunchKitType, project: Project, language: string = 'es') => {
    const isEn = language === 'en';
    const baseInfo = `Product: ${project.name}. Description: ${project.description}. Target: ${project.targetAudience}.`;
    const langNote = `Respond in ${isEn ? 'ENGLISH' : 'SPANISH'}.`;
    
    switch (type) {
        case 'emails':
            return `Generate 3 marketing emails for launch. ${baseInfo}
            ${langNote}
            Respond ONLY with JSON (DO NOT translate keys):
            { 
              "teaser": { "subject": "text", "body": "text" }, 
              "lanzamiento": { "subject": "text", "body": "text" }, 
              "recordatorio": { "subject": "text", "body": "text" } 
            }`;
        case 'productHunt':
            return `Generate Product Hunt copy. ${baseInfo} ${langNote}
            Respond ONLY with JSON (DO NOT translate keys):
            { "tagline": "text max 60 chars", "descripcion": "intro text", "primerComentario": "comment text" }`;
        case 'directories':
            return `Generate directory descriptions. ${baseInfo} ${langNote}
            Respond ONLY with JSON (DO NOT translate keys):
            { "descripcionCorta": "text", "descripcionLarga": "text" }`;
    }
};

export const generateLaunchKitContent = async (type: LaunchKitType, project: Project, config: AIConfig, language: string = 'es') => {
    const prompt = getLaunchKitPrompt(type, project, language);
    try {
        const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, true);
        return JSON.parse(jsonStr || "{}");
    } catch(e) {
        console.error(e);
        return {};
    }
};

export const refineLaunchKitContent = async (type: LaunchKitType, currentContent: any, instruction: string, config: AIConfig, language: string = 'es') => {
    const isEn = language === 'en';
    const prompt = `Rewrite the following texts applying this instruction: "${instruction}".
    Respond in ${isEn ? 'ENGLISH' : 'SPANISH'}.
    
    Current content:
    ${JSON.stringify(currentContent)}
    
    Keep the exact JSON structure. Only modify the values. DO NOT translate the keys.`;

    try {
        const jsonStr = await callOpenRouter([{ role: "user", content: prompt }], config.apiKey, config.textModel, true);
        return JSON.parse(jsonStr || "{}");
    } catch(e) {
        console.error(e);
        return {};
    }
};