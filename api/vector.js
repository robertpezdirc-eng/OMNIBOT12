// 🔹 VECTOR DATABASE API ENDPOINTS
const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * API za upravljanje vektorskih podatkov
 */
module.exports = (vectorManager) => {
    
    // 📊 Status vektorske baze podatkov
    router.get('/status', async (req, res) => {
        try {
            const info = await vectorManager.getInfo();
            res.json({
                success: true,
                data: info,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 📋 Seznam kolekcij
    router.get('/collections', async (req, res) => {
        try {
            const collections = await vectorManager.listCollections();
            res.json({
                success: true,
                data: { collections },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🆕 Ustvari novo kolekcijo
    router.post('/collections', async (req, res) => {
        try {
            const { name, dimension = 768, description = '' } = req.body;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Ime kolekcije je obvezno'
                });
            }

            const success = await vectorManager.createCollection(name, dimension, description);
            
            if (success) {
                res.json({
                    success: true,
                    message: `Kolekcija '${name}' uspešno ustvarjena`,
                    data: { name, dimension, description },
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Napaka pri ustvarjanju kolekcije'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 📊 Statistike kolekcije
    router.get('/collections/:name/stats', async (req, res) => {
        try {
            const { name } = req.params;
            const stats = await vectorManager.getCollectionStats(name);
            
            if (stats) {
                res.json({
                    success: true,
                    data: stats,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Kolekcija ni najdena ali ni dostopna'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 📥 Vstavi vektorje
    router.post('/collections/:name/vectors', async (req, res) => {
        try {
            const { name } = req.params;
            const { vectors } = req.body;
            
            if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Seznam vektorjev je obvezen'
                });
            }

            // Validacija vektorjev
            for (const vector of vectors) {
                if (!vector.vector || !Array.isArray(vector.vector)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Vsak vektor mora imeti polje "vector" z array vrednostmi'
                    });
                }
            }

            const success = await vectorManager.insertVectors(name, vectors);
            
            if (success) {
                res.json({
                    success: true,
                    message: `Vstavljenih ${vectors.length} vektorjev v kolekcijo '${name}'`,
                    data: { collection: name, count: vectors.length },
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Napaka pri vstavljanju vektorjev'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🔍 Iskanje podobnih vektorjev
    router.post('/collections/:name/search', async (req, res) => {
        try {
            const { name } = req.params;
            const { vector, topK = 10, filter = null } = req.body;
            
            if (!vector || !Array.isArray(vector)) {
                return res.status(400).json({
                    success: false,
                    error: 'Iskalni vektor je obvezen'
                });
            }

            const results = await vectorManager.searchVectors(name, vector, topK, filter);
            
            res.json({
                success: true,
                data: {
                    collection: name,
                    query: { topK, filter },
                    results: results,
                    count: results.length
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 📄 Upload dokumentov v kolekcijo
    router.post('/documents/upload', async (req, res) => {
        try {
            // Check if files were uploaded
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No files were uploaded'
                });
            }

            const { collection } = req.body;
            if (!collection) {
                return res.status(400).json({
                    success: false,
                    error: 'Collection name is required'
                });
            }

            const uploadedFiles = [];
            const files = Array.isArray(req.files.documents) ? req.files.documents : [req.files.documents];

            for (const file of files) {
                // Validate file type
                const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md'];
                const fileExt = path.extname(file.name).toLowerCase();
                
                if (!allowedTypes.includes(fileExt)) {
                    return res.status(400).json({
                        success: false,
                        error: `File type ${fileExt} is not supported. Allowed types: ${allowedTypes.join(', ')}`
                    });
                }

                // Simulate document processing
                const processedDoc = {
                    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    filename: file.name,
                    size: file.size,
                    type: file.mimetype,
                    collection: collection,
                    uploadedAt: new Date().toISOString(),
                    status: 'processed',
                    vectorized: true,
                    chunks: Math.ceil(file.size / 1000) // Simulate text chunks
                };

                uploadedFiles.push(processedDoc);
            }

            res.json({
                success: true,
                message: `Successfully uploaded ${uploadedFiles.length} document(s) to collection '${collection}'`,
                documents: uploadedFiles,
                collection: collection,
                totalDocuments: uploadedFiles.length
            });

        } catch (error) {
            console.error('Document upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error during document upload'
            });
        }
    });

    // 🔍 Iskanje po besedilu (text-to-vector search)
    router.post('/search', async (req, res) => {
        try {
            const { query, collection, limit = 10, threshold = 0.7 } = req.body;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: 'Search query is required'
                });
            }

            if (!collection) {
                return res.status(400).json({
                    success: false,
                    error: 'Collection name is required'
                });
            }

            // Simulate search results
            const mockResults = [
                {
                    id: `result_${Date.now()}_1`,
                    document_id: `doc_${Date.now()}_abc123`,
                    filename: 'sample_document.pdf',
                    content: `This is a sample text that matches your query: "${query}". Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
                    score: 0.95,
                    metadata: {
                        page: 1,
                        chunk_id: 'chunk_1',
                        collection: collection
                    }
                },
                {
                    id: `result_${Date.now()}_2`,
                    document_id: `doc_${Date.now()}_def456`,
                    filename: 'another_document.txt',
                    content: `Another relevant passage containing "${query}" with additional context information.`,
                    score: 0.87,
                    metadata: {
                        page: null,
                        chunk_id: 'chunk_5',
                        collection: collection
                    }
                },
                {
                    id: `result_${Date.now()}_3`,
                    document_id: `doc_${Date.now()}_ghi789`,
                    filename: 'third_document.docx',
                    content: `Third result with query "${query}" and some more contextual information for testing.`,
                    score: 0.78,
                    metadata: {
                        page: 3,
                        chunk_id: 'chunk_12',
                        collection: collection
                    }
                }
            ];

            // Filter by threshold and limit
            const filteredResults = mockResults
                .filter(result => result.score >= threshold)
                .slice(0, limit);

            res.json({
                success: true,
                query: query,
                collection: collection,
                results: filteredResults,
                total_results: filteredResults.length,
                search_time: `${Math.random() * 100 + 50}ms`,
                threshold: threshold
            });

        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error during search'
            });
        }
    });

    // 🧪 Test endpoint za preverjanje funkcionalnosti
    router.get('/test', async (req, res) => {
        try {
            if (!vectorManager.isConnected()) {
                return res.status(503).json({
                    success: false,
                    error: 'Vector database ni povezan',
                    timestamp: new Date().toISOString()
                });
            }

            // Test osnovnih operacij
            const testCollection = 'test_collection_' + Date.now();
            const testVector = {
                vector: Array.from({ length: 768 }, () => Math.random()),
                text: 'Test vector',
                metadata: { test: true, timestamp: Date.now() }
            };

            // Ustvari test kolekcijo
            const createSuccess = await vectorManager.createCollection(testCollection, 768, 'Test kolekcija');
            if (!createSuccess) {
                throw new Error('Napaka pri ustvarjanju test kolekcije');
            }

            // Vstavi test vektor
            const insertSuccess = await vectorManager.insertVectors(testCollection, [testVector]);
            if (!insertSuccess) {
                throw new Error('Napaka pri vstavljanju test vektorja');
            }

            // Iskanje test vektorja
            const searchResults = await vectorManager.searchVectors(testCollection, testVector.vector, 1);

            res.json({
                success: true,
                message: 'Vector database test uspešen',
                data: {
                    testCollection,
                    operations: {
                        create: createSuccess,
                        insert: insertSuccess,
                        search: searchResults.length > 0
                    },
                    searchResults: searchResults.length
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🗑️ Izbriši kolekcijo
    router.delete('/collections/:name', async (req, res) => {
        try {
            const { name } = req.params;
            const success = await vectorManager.deleteCollection(name);
            
            if (success) {
                res.json({
                    success: true,
                    message: `Kolekcija '${name}' uspešno izbrisana`,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Napaka pri brisanju kolekcije'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🔄 Posodobi vektorje
    router.put('/collections/:name/vectors', async (req, res) => {
        try {
            const { name } = req.params;
            const { vectors, filter } = req.body;
            
            if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Seznam vektorjev za posodobitev je obvezen'
                });
            }

            const success = await vectorManager.updateVectors(name, vectors, filter);
            
            if (success) {
                res.json({
                    success: true,
                    message: `Posodobljenih ${vectors.length} vektorjev v kolekciji '${name}'`,
                    data: { collection: name, count: vectors.length },
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Napaka pri posodabljanju vektorjev'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🗑️ Izbriši vektorje
    router.delete('/collections/:name/vectors', async (req, res) => {
        try {
            const { name } = req.params;
            const { filter } = req.body;
            
            if (!filter) {
                return res.status(400).json({
                    success: false,
                    error: 'Filter za brisanje je obvezen'
                });
            }

            const success = await vectorManager.deleteVectors(name, filter);
            
            if (success) {
                res.json({
                    success: true,
                    message: `Vektorji uspešno izbrisani iz kolekcije '${name}'`,
                    data: { collection: name, filter },
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Napaka pri brisanju vektorjev'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

// 📋 API endpoint za upravljanje kolekcij - ustvarjanje nove kolekcije
router.post('/collections', async (req, res) => {
    try {
        const { 
            name, 
            dimension = 1536, 
            metric_type = 'COSINE', 
            description = '',
            index_type = 'IVF_FLAT',
            nlist = 1024
        } = req.body;

        // Validacija obveznih parametrov
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Ime kolekcije je obvezno in mora biti besedilo',
                timestamp: new Date().toISOString()
            });
        }

        // Validacija imena kolekcije (samo alfanumerični znaki in podčrtaji)
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            return res.status(400).json({
                success: false,
                error: 'Ime kolekcije lahko vsebuje samo črke, številke in podčrtaje',
                timestamp: new Date().toISOString()
            });
        }

        // Validacija dimenzije
        if (!Number.isInteger(dimension) || dimension < 1 || dimension > 32768) {
            return res.status(400).json({
                success: false,
                error: 'Dimenzija mora biti celo število med 1 in 32768',
                timestamp: new Date().toISOString()
            });
        }

        // Validacija metrike
        const validMetrics = ['COSINE', 'L2', 'IP'];
        if (!validMetrics.includes(metric_type)) {
            return res.status(400).json({
                success: false,
                error: `Metrika mora biti ena od: ${validMetrics.join(', ')}`,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`📋 Ustvarjam novo kolekcijo: ${name}`);
        console.log(`   - Dimenzija: ${dimension}`);
        console.log(`   - Metrika: ${metric_type}`);
        console.log(`   - Opis: ${description}`);

        // Simulacija ustvarjanja kolekcije (v produkciji bi to klicalo pravo vektorsko bazo)
        const collectionData = {
            name,
            dimension,
            metric_type,
            description,
            index_type,
            nlist,
            created_at: new Date().toISOString(),
            status: 'active',
            document_count: 0,
            size_bytes: 0
        };

        // Simulacija preverjanja, če kolekcija že obstaja
        const existingCollections = await getSimulatedCollections();
        if (existingCollections.some(col => col.name === name)) {
            return res.status(409).json({
                success: false,
                error: `Kolekcija z imenom '${name}' že obstaja`,
                timestamp: new Date().toISOString()
            });
        }

        // Simulacija uspešnega ustvarjanja
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulacija časa obdelave

        res.status(201).json({
            success: true,
            message: `Kolekcija '${name}' uspešno ustvarjena`,
            data: collectionData,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Kolekcija '${name}' uspešno ustvarjena`);

    } catch (error) {
        console.error('❌ Napaka pri ustvarjanju kolekcije:', error);
        res.status(500).json({
            success: false,
            error: 'Notranja napaka strežnika pri ustvarjanju kolekcije',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 📋 API endpoint za pridobivanje seznama vseh kolekcij
router.get('/collections', async (req, res) => {
    try {
        const { 
            limit = 50, 
            offset = 0,
            search = '',
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        console.log('📋 Pridobivam seznam kolekcij...');
        console.log(`   - Limit: ${limit}, Offset: ${offset}`);
        console.log(`   - Iskanje: "${search}"`);
        console.log(`   - Sortiranje: ${sort_by} ${sort_order}`);

        // Simulacija pridobivanja kolekcij
        let collections = await getSimulatedCollections();

        // Filtriranje po iskanju
        if (search) {
            collections = collections.filter(col => 
                col.name.toLowerCase().includes(search.toLowerCase()) ||
                col.description.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Sortiranje
        collections.sort((a, b) => {
            let aVal = a[sort_by];
            let bVal = b[sort_by];
            
            if (sort_by === 'created_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (sort_order === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        // Paginacija
        const total = collections.length;
        const paginatedCollections = collections.slice(
            parseInt(offset), 
            parseInt(offset) + parseInt(limit)
        );

        res.json({
            success: true,
            data: {
                collections: paginatedCollections,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + parseInt(limit)) < total
                }
            },
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Vrnjenih ${paginatedCollections.length} od ${total} kolekcij`);

    } catch (error) {
        console.error('❌ Napaka pri pridobivanju kolekcij:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju kolekcij',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 📋 API endpoint za brisanje kolekcije
router.delete('/collections/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { force = false } = req.query;

        // Validacija imena kolekcije
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Ime kolekcije je obvezno',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`🗑️ Brišem kolekcijo: ${name}`);
        console.log(`   - Prisilno brisanje: ${force}`);

        // Simulacija preverjanja obstoja kolekcije
        const collections = await getSimulatedCollections();
        const collection = collections.find(col => col.name === name);

        if (!collection) {
            return res.status(404).json({
                success: false,
                error: `Kolekcija '${name}' ni najdena`,
                timestamp: new Date().toISOString()
            });
        }

        // Simulacija preverjanja, če kolekcija vsebuje dokumente
        if (collection.document_count > 0 && !force) {
            return res.status(400).json({
                success: false,
                error: `Kolekcija '${name}' vsebuje ${collection.document_count} dokumentov. Uporabite ?force=true za prisilno brisanje.`,
                timestamp: new Date().toISOString()
            });
        }

        // Simulacija brisanja
        await new Promise(resolve => setTimeout(resolve, 300));

        res.json({
            success: true,
            message: `Kolekcija '${name}' uspešno izbrisana`,
            data: {
                name,
                documents_deleted: collection.document_count,
                force_used: force
            },
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Kolekcija '${name}' uspešno izbrisana`);

    } catch (error) {
        console.error('❌ Napaka pri brisanju kolekcije:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri brisanju kolekcije',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 📋 Pomožna funkcija za simulacijo kolekcij
async function getSimulatedCollections() {
    // Simulacija različnih kolekcij za testiranje
    return [
        {
            name: 'demo_collection',
            dimension: 1536,
            metric_type: 'COSINE',
            description: 'Demonstracijska kolekcija za testiranje',
            index_type: 'IVF_FLAT',
            created_at: '2024-01-15T10:30:00.000Z',
            status: 'active',
            document_count: 150,
            size_bytes: 2048576
        },
        {
            name: 'documents_slovenian',
            dimension: 768,
            metric_type: 'L2',
            description: 'Slovenski dokumenti in besedila',
            index_type: 'HNSW',
            created_at: '2024-01-20T14:15:00.000Z',
            status: 'active',
            document_count: 89,
            size_bytes: 1536000
        },
        {
            name: 'knowledge_base',
            dimension: 1536,
            metric_type: 'COSINE',
            description: 'Splošna baza znanja',
            index_type: 'IVF_FLAT',
            created_at: '2024-01-25T09:45:00.000Z',
            status: 'active',
            document_count: 0,
            size_bytes: 0
        }
    ];
}
        try {
            const { name } = req.params;
            const info = await vectorManager.getCollectionInfo(name);
            
            if (info) {
                res.json({
                    success: true,
                    data: info,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Kolekcija ni najdena'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🔍 Napredne iskalne funkcionalnosti
    router.post('/collections/:name/search/advanced', async (req, res) => {
        try {
            const { name } = req.params;
            const { 
                vector, 
                topK = 10, 
                filter = null,
                similarity_threshold = 0.0,
                include_metadata = true,
                include_vectors = false,
                search_params = {}
            } = req.body;
            
            if (!vector || !Array.isArray(vector)) {
                return res.status(400).json({
                    success: false,
                    error: 'Iskalni vektor je obvezen'
                });
            }

            const results = await vectorManager.advancedSearch(
                name, 
                vector, 
                topK, 
                filter,
                similarity_threshold,
                include_metadata,
                include_vectors,
                search_params
            );
            
            res.json({
                success: true,
                data: {
                    collection: name,
                    query: { 
                        topK, 
                        filter, 
                        similarity_threshold,
                        include_metadata,
                        include_vectors,
                        search_params
                    },
                    results: results,
                    count: results.length
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🔍 Hibridno iskanje (kombinacija vektorskega in tekstovnega iskanja)
    router.post('/collections/:name/search/hybrid', async (req, res) => {
        try {
            const { name } = req.params;
            const { 
                vector, 
                text_query = null,
                topK = 10, 
                vector_weight = 0.7,
                text_weight = 0.3,
                filter = null
            } = req.body;
            
            if (!vector || !Array.isArray(vector)) {
                return res.status(400).json({
                    success: false,
                    error: 'Iskalni vektor je obvezen za hibridno iskanje'
                });
            }

            const results = await vectorManager.hybridSearch(
                name, 
                vector, 
                text_query,
                topK, 
                vector_weight,
                text_weight,
                filter
            );
            
            res.json({
                success: true,
                data: {
                    collection: name,
                    query: { 
                        vector_weight,
                        text_weight,
                        text_query,
                        topK, 
                        filter
                    },
                    results: results,
                    count: results.length
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🔍 Batch iskanje (več vektorjev naenkrat)
    router.post('/collections/:name/search/batch', async (req, res) => {
        try {
            const { name } = req.params;
            const { 
                vectors, 
                topK = 10, 
                filter = null,
                parallel = true
            } = req.body;
            
            if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Seznam vektorjev je obvezen za batch iskanje'
                });
            }

            // Validacija vektorjev
            for (let i = 0; i < vectors.length; i++) {
                if (!vectors[i] || !Array.isArray(vectors[i])) {
                    return res.status(400).json({
                        success: false,
                        error: `Vektor na poziciji ${i} ni veljaven`
                    });
                }
            }

            const results = await vectorManager.batchSearch(
                name, 
                vectors, 
                topK, 
                filter,
                parallel
            );
            
            res.json({
                success: true,
                data: {
                    collection: name,
                    query: { 
                        batch_size: vectors.length,
                        topK, 
                        filter,
                        parallel
                    },
                    results: results,
                    total_results: results.reduce((sum, batch) => sum + batch.length, 0)
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🔍 Iskanje z agregacijo
    router.post('/collections/:name/search/aggregate', async (req, res) => {
        try {
            const { name } = req.params;
            const { 
                vector, 
                topK = 10, 
                filter = null,
                group_by = null,
                aggregation_type = 'count' // count, avg, sum, min, max
            } = req.body;
            
            if (!vector || !Array.isArray(vector)) {
                return res.status(400).json({
                    success: false,
                    error: 'Iskalni vektor je obvezen'
                });
            }

            const results = await vectorManager.searchWithAggregation(
                name, 
                vector, 
                topK, 
                filter,
                group_by,
                aggregation_type
            );
            
            res.json({
                success: true,
                data: {
                    collection: name,
                    query: { 
                        topK, 
                        filter,
                        group_by,
                        aggregation_type
                    },
                    results: results.results,
                    aggregation: results.aggregation,
                    count: results.results.length
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 🔄 Naloži kolekcijo v pomnilnik
    router.post('/collections/:name/load', async (req, res) => {
        try {
            const { name } = req.params;
            await vectorManager.loadCollection(name);
            
            res.json({
                success: true,
                message: `Kolekcija '${name}' je bila uspešno naložena v pomnilnik`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 📊 Splošne statistike vseh kolekcij
    router.get('/stats', async (req, res) => {
        try {
            const collections = await vectorManager.listCollections();
            let totalVectors = 0;
            let totalSearches = 0;
            let cacheHitRate = 0;
            
            // Pridobi statistike za vsako kolekcijo
            const collectionStats = [];
            for (const collection of collections) {
                try {
                    const stats = await vectorManager.getCollectionStats(collection.name);
                    if (stats) {
                        totalVectors += stats.vectorCount || 0;
                        totalSearches += stats.searchCount || 0;
                        collectionStats.push({
                            name: collection.name,
                            ...stats
                        });
                    }
                } catch (error) {
                    console.warn(`Napaka pri pridobivanju statistik za ${collection.name}:`, error.message);
                }
            }
            
            // Izračunaj povprečno cache hit rate
            if (collectionStats.length > 0) {
                cacheHitRate = collectionStats.reduce((sum, stats) => sum + (stats.cacheHitRate || 0), 0) / collectionStats.length;
            }
            
            res.json({
                success: true,
                data: {
                    totalCollections: collections.length,
                    totalVectors,
                    totalSearches,
                    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
                    collections: collectionStats
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 📊 Podrobne statistike
    router.get('/stats/detailed', async (req, res) => {
        try {
            const collections = await vectorManager.listCollections();
            const detailedStats = [];
            
            for (const collection of collections) {
                try {
                    const stats = await vectorManager.getCollectionStats(collection.name);
                    if (stats) {
                        detailedStats.push({
                            name: collection.name,
                            dimension: collection.dimension,
                            metric: collection.metric,
                            vectorCount: stats.vectorCount || 0,
                            size: stats.size || 0,
                            lastUpdated: stats.lastUpdated || collection.created_at,
                            searchCount: stats.searchCount || 0,
                            cacheHitRate: stats.cacheHitRate || 0,
                            status: stats.status || 'active'
                        });
                    }
                } catch (error) {
                    console.warn(`Napaka pri pridobivanju podrobnih statistik za ${collection.name}:`, error.message);
                    detailedStats.push({
                        name: collection.name,
                        dimension: collection.dimension,
                        metric: collection.metric,
                        vectorCount: 0,
                        size: 0,
                        lastUpdated: collection.created_at,
                        searchCount: 0,
                        cacheHitRate: 0,
                        status: 'error'
                    });
                }
            }
            
            // Razvrsti po velikosti
            detailedStats.sort((a, b) => b.size - a.size);
            
            res.json({
                success: true,
                data: {
                    collections: detailedStats,
                    summary: {
                        totalCollections: detailedStats.length,
                        totalVectors: detailedStats.reduce((sum, col) => sum + col.vectorCount, 0),
                        totalSize: detailedStats.reduce((sum, col) => sum + col.size, 0),
                        totalSearches: detailedStats.reduce((sum, col) => sum + col.searchCount, 0),
                        avgCacheHitRate: detailedStats.length > 0 ? 
                            detailedStats.reduce((sum, col) => sum + col.cacheHitRate, 0) / detailedStats.length : 0
                    }
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    return router;
};