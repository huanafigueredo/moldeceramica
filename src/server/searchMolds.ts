export interface SearchMoldsResult {
  results: any[];
  isFallback: boolean;
  warning?: string;
}

// Offline Smart Library: elegant category-matched fallback results, used whenever
// the Gemini API can't be reached (missing key, quota exceeded, network error).
function buildFallbackResults(query: string) {
  const normalized = (query || "").toLowerCase();

  const isCupOrMug = normalized.includes("caneca") || normalized.includes("copo") || normalized.includes("xícara") || normalized.includes("mug") || normalized.includes("café") || normalized.includes("cha");
  const isVaseOrPot = normalized.includes("vaso") || normalized.includes("pote") || normalized.includes("garrafa") || normalized.includes("cachepot") || normalized.includes("flor");
  const isPlateOrTray = normalized.includes("prato") || normalized.includes("travessa") || normalized.includes("cinzeiro") || normalized.includes("pratinho") || normalized.includes("oval") || normalized.includes("sushi");
  const isNapkinOrHolder = normalized.includes("guardanapo") || normalized.includes("porta") || normalized.includes("suporte") || normalized.includes("organizador");

  const fallbackResults: any[] = [];

  if (isCupOrMug || (!isVaseOrPot && !isPlateOrTray && !isNapkinOrHolder)) {
    fallbackResults.push({
      id: "fallback-cup-1",
      name: `Caneca de Chá Cônica "${query}" Estilo Ateliê`,
      source: "Ateliê Barro & Arte (Offline)",
      description: "Caneca com formato cônico arqueado clássico, excelente pegada e distribuição térmica para cafés ou chás.",
      shapeType: "cone",
      dimensions: { topDiameter: 9.5, bottomDiameter: 6.0, height: 11.0 }
    });
    fallbackResults.push({
      id: "fallback-cup-2",
      name: `Copo Cilíndrico de Café Curto (Flat White)`,
      source: "Design Escandinavo (Offline)",
      description: "Copo reto cilíndrico minimalista muito utilizado para servir cappuccino ou flat white em cafeterias.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 9.0, desiredDiameter: 7.5 }
    });
    fallbackResults.push({
      id: "fallback-cup-3",
      name: `Xícara Cônica Grande de Chocolate Quente`,
      source: "Cerâmica Oxford Coleções (Offline)",
      description: "Modelo cônico amplo com diâmetro superior destacado, perfeita para sopas ou chocolate.",
      shapeType: "cone",
      dimensions: { topDiameter: 11.5, bottomDiameter: 5.5, height: 9.5 }
    });
    fallbackResults.push({
      id: "fallback-cup-4",
      name: `Bowl de Argila Cônico Multiuso`,
      source: "Estilo Westwing Home (Offline)",
      description: "Tigela cônica de proporções elegantes para servir cereais ou caldos com inclinação suave.",
      shapeType: "cone",
      dimensions: { topDiameter: 14.0, bottomDiameter: 8.0, height: 7.5 }
    });
    fallbackResults.push({
      id: "fallback-cup-5",
      name: `Caneco Cilíndrico de Chopp Rústico`,
      source: "Tradição Gaúcha de Torno (Offline)",
      description: "Caneco cilíndrico encorpado com ótimo espaço para aplicação de alças robustas.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 14.5, desiredDiameter: 8.5 }
    });
  } else if (isVaseOrPot) {
    fallbackResults.push({
      id: "fallback-vase-1",
      name: `Vaso Cônico Moderno de Flores "${query}"`,
      source: "Catálogo Tok&Stok (Offline)",
      description: "Vaso decorativo de flores com boca larga e base estreita, oferecendo ótima sustentação para arranjos.",
      shapeType: "cone",
      dimensions: { topDiameter: 13.0, bottomDiameter: 8.0, height: 18.0 }
    });
    fallbackResults.push({
      id: "fallback-vase-2",
      name: `Vaso Cilíndrico Minimalista de Mesa`,
      source: "Pinterest Cerâmica Verde (Offline)",
      description: "Vaso reto perfeito para cactos, suculentas ou pequenas folhagens. Design limpo e contemporâneo.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 11.0, desiredDiameter: 10.0 }
    });
    fallbackResults.push({
      id: "fallback-vase-3",
      name: `Cachepot Cônico para Vasos Médios`,
      source: "Leroy Merlin Jardinagem (Offline)",
      description: "Modelo de cachepot cônico clássico para abrigar vasos plásticos tradicionais de plantas de mesa.",
      shapeType: "cone",
      dimensions: { topDiameter: 16.0, bottomDiameter: 11.0, height: 15.0 }
    });
    fallbackResults.push({
      id: "fallback-vase-4",
      name: `Garrafa Cilíndrica de Decoração`,
      source: "Arte Autoral de Minas (Offline)",
      description: "Vaso esguio estilo garrafa reto para decoração de aparadores e mesas de centro.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 22.0, desiredDiameter: 8.5 }
    });
    fallbackResults.push({
      id: "fallback-vase-5",
      name: `Pote de Condimentos Cilíndrico Reto`,
      source: "Ateliê Terracota Brasil (Offline)",
      description: "Recipiente clássico para armazenamento na cozinha com encaixe para tampa.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 13.0, desiredDiameter: 9.5 }
    });
  } else if (isPlateOrTray) {
    fallbackResults.push({
      id: "fallback-tray-1",
      name: `Travessa Retangular de Cerâmica "${query}"`,
      source: "Ateliê Cerâmica Bistrô (Offline)",
      description: "Travessa retangular rasa excelente para servir saladas e pratos principais com abas anguladas a 45°.",
      shapeType: "tray",
      dimensions: { length: 26.0, width: 16.0, lipHeight: 3.5, lipAngle: 45 }
    });
    fallbackResults.push({
      id: "fallback-tray-2",
      name: `Prato de Sushi Retangular Plano`,
      source: "Cultura Oriental de Placas (Offline)",
      description: "Prato retangular plano com abas curtas, design elegante ideal para técnicas de construção por placas.",
      shapeType: "tray",
      dimensions: { length: 22.0, width: 13.0, lipHeight: 2.0, lipAngle: 30 }
    });
    fallbackResults.push({
      id: "fallback-tray-3",
      name: `Prato de Sobremesa Quadrado`,
      source: "Coleção Terra e Mar (Offline)",
      description: "Prato de sobremesa quadrado com sutil inclinação nas bordas.",
      shapeType: "tray",
      dimensions: { length: 19.0, width: 19.0, lipHeight: 2.5, lipAngle: 40 }
    });
    fallbackResults.push({
      id: "fallback-tray-4",
      name: `Cinzeiro ou Porta-Anéis Delicado`,
      source: "Artesanato Autoral (Offline)",
      description: "Pequeno prato decorativo e utilitário com bordas suaves para chaves, anéis ou cinzas.",
      shapeType: "tray",
      dimensions: { length: 11.5, width: 11.5, lipHeight: 1.8, lipAngle: 35 }
    });
    fallbackResults.push({
      id: "fallback-tray-5",
      name: `Prato Raso de Jantar Gourmet`,
      source: "Linha Oxford Chef (Offline)",
      description: "Prato grande de refeições principais com abas estruturadas e ampla área útil.",
      shapeType: "tray",
      dimensions: { length: 27.0, width: 27.0, lipHeight: 3.0, lipAngle: 45 }
    });
  } else {
    fallbackResults.push({
      id: "fallback-holder-1",
      name: `Porta-Guardanapo Rústico Meia-Lua "${query}"`,
      source: "Ateliê Barro Forte (Offline)",
      description: "Design tradicional dobrado em arco com espessura recomendada de 0.9 cm para evitar empenamento durante a queima.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 12.0, height_napkin: 8.0, depth_napkin: 5.0, thickness_napkin: 0.9 }
    });
    fallbackResults.push({
      id: "fallback-holder-2",
      name: `Porta-Guardanapo Reto Geométrico`,
      source: "Design Modernista Placas (Offline)",
      description: "Modelo reto e fácil de construir a partir de placas cortadas e coladas com barbotina.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 13.5, height_napkin: 7.5, depth_napkin: 4.5, thickness_napkin: 1.0 }
    });
    fallbackResults.push({
      id: "fallback-holder-3",
      name: `Porta-Cartões ou Organizador de Correspondência`,
      source: "Ateliê Organização Organics (Offline)",
      description: "Peça dobrada multiuso para organizar papéis, envelopes e recados na mesa do escritório.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 15.0, height_napkin: 9.0, depth_napkin: 6.0, thickness_napkin: 1.1 }
    });
    fallbackResults.push({
      id: "fallback-holder-4",
      name: `Suporte Organizador de Cardápio para Mesa`,
      source: "Ateliê Gourmet Placas (Offline)",
      description: "Suporte estreito e alto para expor menus impressos ou comunicados em mesas de restaurante.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 11.0, height_napkin: 10.0, depth_napkin: 4.0, thickness_napkin: 0.8 }
    });
    fallbackResults.push({
      id: "fallback-holder-5",
      name: `Porta-Guardanapo Grande de Linho`,
      source: "Coleção Camicado Home (Offline)",
      description: "Suporte robusto e espaçoso para acomodar guardanapos grandes de tecido.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 16.0, height_napkin: 10.0, depth_napkin: 5.5, thickness_napkin: 1.2 }
    });
  }

  return fallbackResults;
}

// Core search logic shared by the local Express dev server and the Vercel
// serverless function, so both entry points behave identically.
export async function searchMolds(query: string): Promise<SearchMoldsResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_;
  if (!apiKey) {
    // No key configured: don't hard-fail the user, gracefully hand them the
    // offline library instead (same experience as a quota/network failure).
    return {
      results: buildFallbackResults(query),
      isFallback: true,
      warning: "A busca por IA em tempo real requer a chave GEMINI_API_KEY (Settings > Secrets no AI Studio). Ativamos a nossa Biblioteca Inteligente Offline para fornecer modelos correspondentes sem interrupção!"
    };
  }

  try {
    // Loaded dynamically so a missing/misconfigured GEMINI_API_KEY (the
    // common case on a fresh deploy) never pulls this SDK into the module's
    // cold-start path — the early return above already handles that case.
    const { GoogleGenAI, Type } = await import("@google/genai");

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `Procure por produtos e moldes de cerâmica reais na internet que correspondam à busca "${query}".
    Encontre exatamente 5 opções reais de cerâmica (canecas, copos, vasos, travessas, pratos, luminárias, porta-guardanapos ou caixas/prismas) com suas respectivas dimensões estimadas ou recomendadas em centímetros (altura, diâmetro, comprimento, largura, etc.).
    Atribua cada um deles a um dos 5 moldes base disponíveis no nosso app:
    1. 'cylinder' (para copos, canecas ou vasos cilíndricos retos. Requer: desiredHeight, desiredDiameter)
    2. 'cone' (para canecas, vasos ou potes cônicos/com boca maior. Requer: topDiameter, bottomDiameter, height)
    3. 'tray' (para travessas, pratos, cinzeiros ou pratinhos de borda inclinada. Requer: length, width, lipHeight, lipAngle [ex: 45 ou 30])
    4. 'napkin_holder' (para porta-guardanapos ou pequenas placas dobradas. Requer: width_napkin, height_napkin, depth_napkin, thickness_napkin [geralmente 0.8 a 1.2 cm])
    5. 'box' (para caixas, cubos, prismas retangulares ou potes de placas. Requer: width, height, depth, thickness [geralmente 0.8 cm])

    Forneça uma descrição curta de cada objeto, indicando o site, loja ou fonte de referência se aplicável no campo "source" (ex: "Inspirado em cerâmicas da Tok&Stok" ou "Referência Toki Alquimia").`;

    const schemaConfig = {
      type: Type.ARRAY,
      description: "Lista de exatamente 5 opções de cerâmica com dimensões mapeadas para moldes parametrizados.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING, description: "Nome do produto de cerâmica encontrado." },
          source: { type: Type.STRING, description: "Breve indicação de onde esse modelo foi baseado ou site de referência." },
          description: { type: Type.STRING, description: "Breve explicação do design e estilo da peça." },
          shapeType: {
            type: Type.STRING,
            description: "Deve ser EXATAMENTE um destes: 'cylinder', 'cone', 'tray', 'napkin_holder', 'box'"
          },
          dimensions: {
            type: Type.OBJECT,
            description: "Valores numéricos das dimensões físicas estimadas da peça pronta (em centímetros). Forneça apenas as propriedades correspondentes ao shapeType escolhido.",
            properties: {
              desiredHeight: { type: Type.NUMBER, description: "Altura do cilindro (para cylinder)" },
              desiredDiameter: { type: Type.NUMBER, description: "Diâmetro do cilindro (para cylinder)" },
              topDiameter: { type: Type.NUMBER, description: "Diâmetro superior (para cone)" },
              bottomDiameter: { type: Type.NUMBER, description: "Diâmetro inferior (para cone)" },
              height: { type: Type.NUMBER, description: "Altura (para cone ou box)" },
              length: { type: Type.NUMBER, description: "Comprimento ou diâmetro maior (para tray)" },
              width: { type: Type.NUMBER, description: "Largura (para tray ou box)" },
              lipHeight: { type: Type.NUMBER, description: "Altura da aba inclinada (para tray)" },
              lipAngle: { type: Type.NUMBER, description: "Ângulo da aba inclinada em graus (para tray, ex: 45)" },
              width_napkin: { type: Type.NUMBER, description: "Largura da placa (para napkin_holder, ex: 12)" },
              height_napkin: { type: Type.NUMBER, description: "Altura da aba (para napkin_holder, ex: 8)" },
              depth_napkin: { type: Type.NUMBER, description: "Espaçamento ou profundidade da dobra (para napkin_holder, ex: 5)" },
              thickness_napkin: { type: Type.NUMBER, description: "Espessura da placa de argila (para napkin_holder, ex: 0.8)" },
              depth: { type: Type.NUMBER, description: "Profundidade/largura da caixa (para box)" },
              thickness: { type: Type.NUMBER, description: "Espessura da placa de argila (para box, ex: 0.8)" }
            }
          }
        },
        required: ["id", "name", "source", "description", "shapeType", "dimensions"]
      }
    };

    let timeoutId: any;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timeout de 25s excedido ao chamar a API do Gemini")), 25000);
    });

    const generatePromise = (async () => {
      let resultText = "";
      try {
        console.log("Tentativa 1: Chamando Gemini-3.5-flash com Busca Grounding...");
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "Você é um mestre ceramista e arquiteto de moldes. Você ajuda a pesquisar e extrair dimensões reais de cerâmicas para gerar moldes de papel 1:1.",
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: schemaConfig
          }
        });
        resultText = response.text || "[]";
      } catch (err: any) {
        console.warn("Falha na tentativa 1 (Grounded Search ou limite de API). Tentando sem grounding...", err);
        // Fallback retry using standard knowledge to bypass search quotas
        const responseFallback = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt + "\nPor favor, utilize o seu próprio conhecimento especializado de cerâmica para produzir estes 5 resultados ideias.",
          config: {
            systemInstruction: "Você é um mestre ceramista e arquiteto de moldes. Você ajuda a pesquisar e extrair dimensões reais de cerâmicas para gerar moldes de papel 1:1.",
            responseMimeType: "application/json",
            responseSchema: schemaConfig
          }
        });
        resultText = responseFallback.text || "[]";
      }
      return resultText;
    })();

    const jsonTextRaw = await Promise.race([generatePromise, timeoutPromise]) as string;
    clearTimeout(timeoutId);

    let jsonText = jsonTextRaw || "[]";
    // Sanity cleaning of markdown wrapped blocks if any
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json/, "").replace(/```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```/, "").replace(/```$/, "");
    }

    const data = JSON.parse(jsonText.trim());
    const finalResults = Array.isArray(data) ? data : (data.results || []);
    return { results: finalResults, isFallback: false };

  } catch (error: any) {
    console.warn("Erro ao chamar a API do Gemini (Ativando Fallback de Biblioteca Offline):", error);

    return {
      results: buildFallbackResults(query),
      isFallback: true,
      warning: "Sua chave de API do Gemini atingiu o limite de cota temporário ou expirou. Ativamos a nossa Biblioteca Inteligente Offline para fornecer modelos correspondentes sem interrupção!"
    };
  }
}
