/**
 * Knowledge service for managing and retrieving knowledge data
 */
const fs = require('fs').promises;
const path = require('path');

let knowledgeBase = [];
let tfidfData = {};

function preprocess(text) {
    if (typeof text !== 'string') return [];
    return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}

function computeTF(documents) {
    const tfs = new Map();
    documents.forEach(doc => {
        const termFrequencies = new Map();
        const tokens = preprocess(JSON.stringify(doc.content));
        const tokenCount = tokens.length;
        if (tokenCount === 0) {
            tfs.set(doc.fileName, termFrequencies);
            return;
        }
        tokens.forEach(token => {
            termFrequencies.set(token, (termFrequencies.get(token) || 0) + 1);
        });
        termFrequencies.forEach((count, term) => {
            termFrequencies.set(term, count / tokenCount);
        });
        tfs.set(doc.fileName, termFrequencies);
    });
    return tfs;
}

function computeIDF(documents) {
    const idf = new Map();
    const docCount = documents.length;
    const docFrequency = new Map();

    documents.forEach(doc => {
        const tokensInDoc = new Set(preprocess(JSON.stringify(doc.content)));
        tokensInDoc.forEach(token => {
            docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
        });
    });

    docFrequency.forEach((count, term) => {
        idf.set(term, Math.log(docCount / (1 + count)));
    });
    
    return idf;
}

async function initializeTfIdf() {
    console.log("Initializing TF-IDF model...");
    const tfs = computeTF(knowledgeBase);
    const idf = computeIDF(knowledgeBase);
    
    const tfidfVectors = new Map();
    knowledgeBase.forEach(doc => {
        const vector = new Map();
        const docTFs = tfs.get(doc.fileName);
        if (docTFs) {
            docTFs.forEach((tf, term) => {
                vector.set(term, tf * (idf.get(term) || 0));
            });
        }
        tfidfVectors.set(doc.fileName, vector);
    });
    
    tfidfData = { idf, tfidfVectors };
    console.log("TF-IDF model initialized.");
}

async function loadInitialData() {
    try {
        console.log("Loading knowledge base...");
        knowledgeBase = [];
        const knowledgePath = path.join(__dirname, '../knowledge');
        const files = await fs.readdir(knowledgePath);
        for (const file of files) {
            if (path.extname(file) === '.json') {
                const filePath = path.join(knowledgePath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                knowledgeBase.push({
                    fileName: file,
                    content: JSON.parse(content)
                });
            }
        }
        console.log(`${knowledgeBase.length} knowledge files loaded.`);
        await initializeTfIdf();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

function queryKnowledgeBase(query, topN = 2) {
    if (!query || !tfidfData.idf || !tfidfData.tfidfVectors) return '';

    const queryTokens = preprocess(query);
    const queryVector = new Map();
    const tokenCount = queryTokens.length;

    if (tokenCount === 0) return '';

    queryTokens.forEach(token => {
        queryVector.set(token, (queryVector.get(token) || 0) + 1);
    });
    queryVector.forEach((count, term) => {
        const tf = count / tokenCount;
        const idf = tfidfData.idf.get(term) || 0;
        queryVector.set(term, tf * idf);
    });

    const scores = [];
    knowledgeBase.forEach(doc => {
        const docVector = tfidfData.tfidfVectors.get(doc.fileName);
        if (!docVector) return;

        let dotProduct = 0;
        let queryMagnitude = 0;
        let docMagnitude = 0;
        
        const allTerms = new Set([...queryVector.keys(), ...docVector.keys()]);
        allTerms.forEach(term => {
            const queryVal = queryVector.get(term) || 0;
            const docVal = docVector.get(term) || 0;
            dotProduct += queryVal * docVal;
        });
        
        queryVector.forEach(val => queryMagnitude += val * val);
        docVector.forEach(val => docMagnitude += val * val);
        
        queryMagnitude = Math.sqrt(queryMagnitude);
        docMagnitude = Math.sqrt(docMagnitude);

        const denominator = queryMagnitude * docMagnitude;
        const similarity = denominator === 0 ? 0 : dotProduct / denominator;

        if (similarity > 0.01) { // Threshold to avoid irrelevant matches
            scores.push({ fileName: doc.fileName, score: similarity });
        }
    });

    scores.sort((a, b) => b.score - a.score);
    
    const topDocs = scores.slice(0, topN);
    return topDocs.map(hit => {
        const doc = knowledgeBase.find(d => d.fileName === hit.fileName);
        return `Source: ${doc.fileName}\nContent:\n${JSON.stringify(doc.content, null, 2)}`;
    }).join('\n\n');
}

function findLocationInText(text) {
    const scienceData = knowledgeBase.find(kb => kb.fileName.includes('science.json'))?.content;
    if (scienceData?.planets) {
        for (const planet of scienceData.planets) {
            if (planet.location && text.toLowerCase().includes(planet.name.toLowerCase())) {
                return planet.location;
            }
        }
    }
    return null;
}

function getApps() {
    return knowledgeBase.find(kb => kb.fileName === 'apps.json')?.content?.applications || [];
}

function getAllKnowledge() {
    return knowledgeBase;
}

function getKnowledgeByCategory(category) {
    const categoryMap = {
        'apps': 'apps.json',
        'cookbook': 'cookbook.json',
        'science': 'science.json',
        'technology': 'technology.json',
        'cosmic_truths': 'cosmic_truths.json'
    };
    
    const fileName = categoryMap[category];
    return knowledgeBase.find(kb => kb.fileName === fileName)?.content || null;
}

function getCategories() {
    return knowledgeBase.map(kb => ({
        id: kb.fileName.replace('.json', ''),
        title: kb.content.title || kb.fileName,
        source: kb.content.source || 'Unknown',
        fileName: kb.fileName,
        itemCount: getItemCount(kb.content)
    }));
}

function getItemCount(content) {
    return (content.applications?.length || 0) +
           (content.recipes?.length || 0) +
           (content.planets?.length || 0) +
           (content.languages?.length || 0);
}

function generateContextualPrompts(category) {
    const prompts = [];

    if (category === 'apps') {
        prompts.push(
            "Tell me about the best free applications for productivity",
            "Compare WhatsApp alternatives and their features",
            "What are the best cross-platform applications?",
            "Recommend applications for creative work"
        );
    } else if (category === 'cookbook') {
        prompts.push(
            "Give me a simple breakfast recipe",
            "How do I make tomato soup from scratch?",
            "What are some easy recipes for beginners?",
            "Suggest a quick meal I can make in 30 minutes"
        );
    } else if (category === 'science') {
        prompts.push(
            "Tell me interesting facts about Mars",
            "Compare the planets in our solar system",
            "What makes Earth unique among planets?",
            "Explain the characteristics of Mercury"
        );
    } else if (category === 'technology') {
        prompts.push(
            "What programming language should I learn first?",
            "Compare JavaScript and Python for beginners",
            "Tell me about modern programming languages",
            "What is Rust used for in programming?"
        );
    }

    return prompts;
}

function searchKnowledge(query) {
    const results = [];
    const searchTerm = query.toLowerCase();

    knowledgeBase.forEach(kb => {
        const data = kb.content;
        const category = kb.fileName.replace('.json', '');
        
        // Search in different data structures
        if (data.applications) {
            data.applications.forEach(app => {
                if (app.name.toLowerCase().includes(searchTerm) || 
                    app.description.toLowerCase().includes(searchTerm)) {
                    results.push({
                        category,
                        type: 'application',
                        item: app,
                        relevance: calculateRelevance(app, searchTerm)
                    });
                }
            });
        }

        if (data.recipes) {
            data.recipes.forEach(recipe => {
                if (recipe.name.toLowerCase().includes(searchTerm) || 
                    recipe.description.toLowerCase().includes(searchTerm)) {
                    results.push({
                        category,
                        type: 'recipe',
                        item: recipe,
                        relevance: calculateRelevance(recipe, searchTerm)
                    });
                }
            });
        }

        if (data.planets) {
            data.planets.forEach(planet => {
                if (planet.name.toLowerCase().includes(searchTerm) || 
                    planet.details.toLowerCase().includes(searchTerm)) {
                    results.push({
                        category,
                        type: 'planet',
                        item: planet,
                        relevance: calculateRelevance(planet, searchTerm)
                    });
                }
            });
        }

        if (data.languages) {
            data.languages.forEach(lang => {
                if (lang.name.toLowerCase().includes(searchTerm) || 
                    lang.use_case.toLowerCase().includes(searchTerm)) {
                    results.push({
                        category,
                        type: 'language',
                        item: lang,
                        relevance: calculateRelevance(lang, searchTerm)
                    });
                }
            });
        }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
}

function calculateRelevance(item, searchTerm) {
    let score = 0;
    const name = (item.name || '').toLowerCase();
    const description = (item.description || item.details || item.use_case || '').toLowerCase();

    if (name.includes(searchTerm)) score += 10;
    if (name.startsWith(searchTerm)) score += 5;
    if (description.includes(searchTerm)) score += 3;

    return score;
}

module.exports = {
    loadInitialData,
    queryKnowledgeBase,
    findLocationInText,
    getApps,
    getAllKnowledge,
    getKnowledgeByCategory,
    getCategories,
    generateContextualPrompts,
    searchKnowledge
};