/**
 * Curated offline mold reference library, matched by keyword against the
 * search query. Runs entirely client-side — no server call, no API key.
 */

export function getOfflineMoldSuggestions(query: string) {
  const normalized = (query || "").toLowerCase();

  const isCupOrMug = normalized.includes("caneca") || normalized.includes("copo") || normalized.includes("xícara") || normalized.includes("mug") || normalized.includes("café") || normalized.includes("cha");
  const isVaseOrPot = normalized.includes("vaso") || normalized.includes("pote") || normalized.includes("garrafa") || normalized.includes("cachepot") || normalized.includes("flor");
  const isPlateOrTray = normalized.includes("prato") || normalized.includes("travessa") || normalized.includes("cinzeiro") || normalized.includes("pratinho") || normalized.includes("oval") || normalized.includes("sushi");
  const isNapkinOrHolder = normalized.includes("guardanapo") || normalized.includes("porta") || normalized.includes("suporte") || normalized.includes("organizador");

  const results: any[] = [];

  if (isCupOrMug || (!isVaseOrPot && !isPlateOrTray && !isNapkinOrHolder)) {
    results.push({
      id: "fallback-cup-1",
      name: `Caneca de Chá Cônica "${query}" Estilo Ateliê`,
      source: "Ateliê Barro & Arte",
      description: "Caneca com formato cônico arqueado clássico, excelente pegada e distribuição térmica para cafés ou chás.",
      shapeType: "cone",
      dimensions: { topDiameter: 9.5, bottomDiameter: 6.0, height: 11.0 }
    });
    results.push({
      id: "fallback-cup-2",
      name: `Copo Cilíndrico de Café Curto (Flat White)`,
      source: "Design Escandinavo",
      description: "Copo reto cilíndrico minimalista muito utilizado para servir cappuccino ou flat white em cafeterias.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 9.0, desiredDiameter: 7.5 }
    });
    results.push({
      id: "fallback-cup-3",
      name: `Xícara Cônica Grande de Chocolate Quente`,
      source: "Cerâmica Oxford Coleções",
      description: "Modelo cônico amplo com diâmetro superior destacado, perfeita para sopas ou chocolate.",
      shapeType: "cone",
      dimensions: { topDiameter: 11.5, bottomDiameter: 5.5, height: 9.5 }
    });
    results.push({
      id: "fallback-cup-4",
      name: `Bowl de Argila Cônico Multiuso`,
      source: "Estilo Westwing Home",
      description: "Tigela cônica de proporções elegantes para servir cereais ou caldos com inclinação suave.",
      shapeType: "cone",
      dimensions: { topDiameter: 14.0, bottomDiameter: 8.0, height: 7.5 }
    });
    results.push({
      id: "fallback-cup-5",
      name: `Caneco Cilíndrico de Chopp Rústico`,
      source: "Tradição Gaúcha de Torno",
      description: "Caneco cilíndrico encorpado com ótimo espaço para aplicação de alças robustas.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 14.5, desiredDiameter: 8.5 }
    });
  } else if (isVaseOrPot) {
    results.push({
      id: "fallback-vase-1",
      name: `Vaso Cônico Moderno de Flores "${query}"`,
      source: "Catálogo Tok&Stok",
      description: "Vaso decorativo de flores com boca larga e base estreita, oferecendo ótima sustentação para arranjos.",
      shapeType: "cone",
      dimensions: { topDiameter: 13.0, bottomDiameter: 8.0, height: 18.0 }
    });
    results.push({
      id: "fallback-vase-2",
      name: `Vaso Cilíndrico Minimalista de Mesa`,
      source: "Pinterest Cerâmica Verde",
      description: "Vaso reto perfeito para cactos, suculentas ou pequenas folhagens. Design limpo e contemporâneo.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 11.0, desiredDiameter: 10.0 }
    });
    results.push({
      id: "fallback-vase-3",
      name: `Cachepot Cônico para Vasos Médios`,
      source: "Leroy Merlin Jardinagem",
      description: "Modelo de cachepot cônico clássico para abrigar vasos plásticos tradicionais de plantas de mesa.",
      shapeType: "cone",
      dimensions: { topDiameter: 16.0, bottomDiameter: 11.0, height: 15.0 }
    });
    results.push({
      id: "fallback-vase-4",
      name: `Garrafa Cilíndrica de Decoração`,
      source: "Arte Autoral de Minas",
      description: "Vaso esguio estilo garrafa reto para decoração de aparadores e mesas de centro.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 22.0, desiredDiameter: 8.5 }
    });
    results.push({
      id: "fallback-vase-5",
      name: `Pote de Condimentos Cilíndrico Reto`,
      source: "Ateliê Terracota Brasil",
      description: "Recipiente clássico para armazenamento na cozinha com encaixe para tampa.",
      shapeType: "cylinder",
      dimensions: { desiredHeight: 13.0, desiredDiameter: 9.5 }
    });
  } else if (isPlateOrTray) {
    results.push({
      id: "fallback-tray-1",
      name: `Travessa Retangular de Cerâmica "${query}"`,
      source: "Ateliê Cerâmica Bistrô",
      description: "Travessa retangular rasa excelente para servir saladas e pratos principais com abas anguladas a 45°.",
      shapeType: "tray",
      dimensions: { length: 26.0, width: 16.0, lipHeight: 3.5, lipAngle: 45 }
    });
    results.push({
      id: "fallback-tray-2",
      name: `Prato de Sushi Retangular Plano`,
      source: "Cultura Oriental de Placas",
      description: "Prato retangular plano com abas curtas, design elegante ideal para técnicas de construção por placas.",
      shapeType: "tray",
      dimensions: { length: 22.0, width: 13.0, lipHeight: 2.0, lipAngle: 30 }
    });
    results.push({
      id: "fallback-tray-3",
      name: `Prato de Sobremesa Quadrado`,
      source: "Coleção Terra e Mar",
      description: "Prato de sobremesa quadrado com sutil inclinação nas bordas.",
      shapeType: "tray",
      dimensions: { length: 19.0, width: 19.0, lipHeight: 2.5, lipAngle: 40 }
    });
    results.push({
      id: "fallback-tray-4",
      name: `Cinzeiro ou Porta-Anéis Delicado`,
      source: "Artesanato Autoral",
      description: "Pequeno prato decorativo e utilitário com bordas suaves para chaves, anéis ou cinzas.",
      shapeType: "tray",
      dimensions: { length: 11.5, width: 11.5, lipHeight: 1.8, lipAngle: 35 }
    });
    results.push({
      id: "fallback-tray-5",
      name: `Prato Raso de Jantar Gourmet`,
      source: "Linha Oxford Chef",
      description: "Prato grande de refeições principais com abas estruturadas e ampla área útil.",
      shapeType: "tray",
      dimensions: { length: 27.0, width: 27.0, lipHeight: 3.0, lipAngle: 45 }
    });
  } else {
    results.push({
      id: "fallback-holder-1",
      name: `Porta-Guardanapo Rústico Meia-Lua "${query}"`,
      source: "Ateliê Barro Forte",
      description: "Design tradicional dobrado em arco com espessura recomendada de 0.9 cm para evitar empenamento durante a queima.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 12.0, height_napkin: 8.0, depth_napkin: 5.0, thickness_napkin: 0.9 }
    });
    results.push({
      id: "fallback-holder-2",
      name: `Porta-Guardanapo Reto Geométrico`,
      source: "Design Modernista Placas",
      description: "Modelo reto e fácil de construir a partir de placas cortadas e coladas com barbotina.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 13.5, height_napkin: 7.5, depth_napkin: 4.5, thickness_napkin: 1.0 }
    });
    results.push({
      id: "fallback-holder-3",
      name: `Porta-Cartões ou Organizador de Correspondência`,
      source: "Ateliê Organização Organics",
      description: "Peça dobrada multiuso para organizar papéis, envelopes e recados na mesa do escritório.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 15.0, height_napkin: 9.0, depth_napkin: 6.0, thickness_napkin: 1.1 }
    });
    results.push({
      id: "fallback-holder-4",
      name: `Suporte Organizador de Cardápio para Mesa`,
      source: "Ateliê Gourmet Placas",
      description: "Suporte estreito e alto para expor menus impressos ou comunicados em mesas de restaurante.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 11.0, height_napkin: 10.0, depth_napkin: 4.0, thickness_napkin: 0.8 }
    });
    results.push({
      id: "fallback-holder-5",
      name: `Porta-Guardanapo Grande de Linho`,
      source: "Coleção Camicado Home",
      description: "Suporte robusto e espaçoso para acomodar guardanapos grandes de tecido.",
      shapeType: "napkin_holder",
      dimensions: { width_napkin: 16.0, height_napkin: 10.0, depth_napkin: 5.5, thickness_napkin: 1.2 }
    });
  }

  return results;
}
