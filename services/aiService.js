const knowledgeService = require('./knowledgeService');

/**
 * Process a user query and generate a response with real web search
 * @param {string} query - The user's query
 * @param {string} persona - Optional AI persona to use (default, friendly, technical, creative)
 * @param {Function} webSearchFunction - Function to perform web search
 * @returns {string} - The AI response
 */
async function processQuery(query, persona = 'default', webSearchFunction = null) {
  try {
    // Get relevant knowledge from local database
    const knowledge = knowledgeService.getRelevantKnowledge(query);
    
    // Perform web search for additional information
    let webResults = null;
    if (webSearchFunction) {
      try {
        webResults = await webSearchFunction(query);
      } catch (error) {
        console.warn('Web search failed, using local knowledge only:', error.message);
      }
    }
    
    // Log query for analytics
    console.log(`[${new Date().toISOString()}] Query processed: "${query}" (Persona: ${persona})`);
    
    // Apply persona-specific response style
    switch (persona) {
      case 'friendly':
        return generateFriendlyResponse(query, knowledge, webResults);
      case 'technical':
        return generateTechnicalResponse(query, knowledge, webResults);
      case 'creative':
        return generateCreativeResponse(query, knowledge, webResults);
      case 'analytical':
        return generateAnalyticalResponse(query, knowledge, webResults);
      case 'default':
      default:
        return generateInformedResponse(query, knowledge, webResults);
    }
  } catch (error) {
    console.error('Error processing query:', error);
    return 'Oprostite, prišlo je do napake pri obdelavi vašega vprašanja. Prosim poskusite znova.';
  }
}

/**
 * Generate an informed response using local knowledge and web search results
 * @param {string} query - User's query
 * @param {object} knowledge - Relevant local knowledge
 * @param {object} webResults - Web search results
 * @returns {string} - Informed response
 */
function generateInformedResponse(query, knowledge, webResults) {
  let response = `Glede na vaše vprašanje "${query}", lahko povem naslednje:\n\n`;
  
  // Add local knowledge if available
  if (knowledge && knowledge.length > 0) {
    response += `📚 Iz naše baze znanja:\n`;
    knowledge.slice(0, 2).forEach((item, index) => {
      response += `${index + 1}. ${item.content}\n`;
    });
    response += '\n';
  }
  
  // Add web search results if available
  if (webResults && webResults.length > 0) {
    response += `🌐 Najnovejše informacije iz spleta:\n`;
    webResults.slice(0, 3).forEach((result, index) => {
      response += `${index + 1}. ${result.title || result.snippet || result.content}\n`;
    });
    response += '\n';
  }
  
  // If no information available, provide helpful guidance
  if ((!knowledge || knowledge.length === 0) && (!webResults || webResults.length === 0)) {
    response = `Za vaše vprašanje "${query}" trenutno nimam specifičnih informacij v svoji bazi znanja. Priporočam, da:\n\n`;
    response += `• Preverite uradno dokumentacijo ali spletne vire\n`;
    response += `• Kontaktirate strokovnjake na tem področju\n`;
    response += `• Poskusite preformulirati vprašanje z drugimi ključnimi besedami\n`;
  }
  
  return response;
}

/**
 * Generates a friendly, conversational response
 * @param {string} query - The user's query
 * @param {object} knowledge - Relevant knowledge
 * @param {object} webResults - Web search results
 * @returns {string} - A friendly response
 */
function generateFriendlyResponse(query, knowledge, webResults) {
  const greetings = ["Pozdravljeni! ", "Živjo! ", "Hej! "];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi') || query.toLowerCase().includes('pozdravljeni')) {
    return `${greeting}Kako se imate danes? Ali vam lahko s čim pomagam?`;
  }
  
  let response = `${greeting}Pogledal sem si vaše vprašanje "${query}". `;
  
  if (knowledge && knowledge.length > 0) {
    response += `Iz naše baze znanja lahko povem: ${knowledge[0].content}`;
  }
  
  if (webResults && webResults.length > 0) {
    response += ` Prav tako sem našel najnovejše informacije, ki bi vam lahko pomagale.`;
  }
  
  return response;
}

/**
 * Generates a technical, detailed response
 * @param {string} query - The user's query
 * @param {object} knowledge - Relevant knowledge
 * @param {object} webResults - Web search results
 * @returns {string} - A technical response
 */
function generateTechnicalResponse(query, knowledge, webResults) {
  let response = `Tehnična analiza za: "${query}"\n\n`;
  
  if (knowledge && knowledge.length > 0) {
    response += `📋 Lokalni podatki:\n`;
    knowledge.forEach((item, index) => {
      response += `${index + 1}. ${item.title}: ${item.content}\n`;
    });
    response += '\n';
  }
  
  if (webResults && webResults.length > 0) {
    response += `🔍 Spletni viri:\n`;
    webResults.forEach((result, index) => {
      response += `${index + 1}. ${result.title || 'Brez naslova'}\n`;
      response += `   ${result.snippet || result.content || 'Brez opisa'}\n`;
    });
    response += '\n';
  }
  
  response += `Priporočila za nadaljnje raziskovanje:\n`;
  response += `• Preverite najnovejšo dokumentacijo\n`;
  response += `• Testirajte v kontroliranem okolju\n`;
  response += `• Upoštevajte varnostne smernice\n`;
  
  return response;
}

/**
 * Generates a creative, imaginative response
 * @param {string} query - The user's query
 * @param {object} knowledge - Relevant knowledge
 * @param {object} webResults - Web search results
 * @returns {string} - A creative response
 */
function generateCreativeResponse(query, knowledge, webResults) {
  const creativeIntros = [
    "Predstavljajte si svet, kjer ",
    "V kraljestvu neskončnih možnosti ",
    "Dovolite mi, da naslikam sliko z besedami: "
  ];
  
  const intro = creativeIntros[Math.floor(Math.random() * creativeIntros.length)];
  let response = `${intro}vaše vprašanje o "${query}" se razpre v fascinantno zgodbo.\n\n`;
  
  if (knowledge && knowledge.length > 0) {
    response += `🎨 Kreativna interpretacija znanja:\n`;
    response += `${knowledge[0].content} - to odpira vrata novim možnostim in inovativnim rešitvam.\n\n`;
  }
  
  if (webResults && webResults.length > 0) {
    response += `✨ Navdih iz sveta:\n`;
    response += `Najnovejši trendi kažejo, da se področje "${query}" razvija v smeri, ki presega naša trenutna pričakovanja.\n\n`;
  }
  
  response += `Kreativni predlogi:\n`;
  response += `• Razmislite o nekonvencionalnih pristopih\n`;
  response += `• Kombinirajte različne discipline\n`;
  response += `• Eksperimentirajte z novimi metodami\n`;
  
  return response;
}

/**
 * Generates an analytical, data-driven response
 * @param {string} query - The user's query
 * @param {object} knowledge - Relevant knowledge
 * @param {object} webResults - Web search results
 * @returns {string} - An analytical response
 */
function generateAnalyticalResponse(query, knowledge, webResults) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  let response = `📊 Analitični pregled za: "${query}"\n`;
  response += `Datum analize: ${currentDate}\n\n`;
  
  if (knowledge && knowledge.length > 0) {
    response += `📈 Analiza lokalnih podatkov:\n`;
    response += `- Najdenih ${knowledge.length} relevantnih vnosov\n`;
    response += `- Primarni vir: ${knowledge[0].title}\n`;
    response += `- Stopnja zaupanja: Visoka\n`;
    response += `- Vsebina: ${knowledge[0].content}\n\n`;
  }
  
  if (webResults && webResults.length > 0) {
    response += `🌐 Analiza spletnih virov:\n`;
    response += `- Najdenih ${webResults.length} spletnih rezultatov\n`;
    response += `- Aktualnost: Najnovejši podatki\n`;
    response += `- Relevantnost: Visoka\n\n`;
    
    response += `Ključni rezultati:\n`;
    webResults.slice(0, 2).forEach((result, index) => {
      response += `${index + 1}. ${result.title || 'Brez naslova'}\n`;
    });
    response += '\n';
  }
  
  if ((!knowledge || knowledge.length === 0) && (!webResults || webResults.length === 0)) {
    response += `⚠️ Omejeni podatki:\n`;
    response += `- Ni neposrednih zadetkov v bazi znanja\n`;
    response += `- Stopnja zaupanja: Nizka\n`;
    response += `- Priporočilo: Razširitev parametrov iskanja\n\n`;
  }
  
  response += `📋 Priporočila:\n`;
  response += `• Nadaljnje raziskovanje v povezanih domenah\n`;
  response += `• Preverjanje dodatnih virov\n`;
  response += `• Redno posodabljanje podatkov\n`;
  
  return response;
}

module.exports = {
  processQuery
};