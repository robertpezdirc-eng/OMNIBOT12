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
    const appsData = knowledgeBase.find(kb => kb.fileName === 'apps.json');
    return (appsData && appsData.content.applications) ? appsData.content.applications : [];
}

module.exports = {
    loadInitialData,
    queryKnowledgeBase,
    findLocationInText,
    getApps
};