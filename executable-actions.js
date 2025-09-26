/**
 * Omnija Executable Actions System
 * Sistem za izvršna dejanja vseh aplikacij
 */

class ExecutableActions {
    constructor() {
        this.actions = {
            documents: [
                {
                    id: 'create_vehicle_sale_form',
                    name: 'Obrazec za prodajo vozila',
                    description: 'Ustvari uradni obrazec za prodajo motornega vozila',
                    category: 'documents',
                    parameters: ['sellerName', 'buyerName', 'vehicleData', 'price']
                },
                {
                    id: 'create_contract',
                    name: 'Pogodba',
                    description: 'Ustvari pravno veljavno pogodbo',
                    category: 'documents',
                    parameters: ['contractType', 'parties', 'terms']
                },
                {
                    id: 'create_invoice',
                    name: 'Račun',
                    description: 'Ustvari profesionalni račun',
                    category: 'documents',
                    parameters: ['seller', 'buyer', 'items', 'total']
                }
            ],
            games: [
                {
                    id: 'create_chess_game',
                    name: 'Šahovska igra',
                    description: 'Zaženi interaktivno šahovsko igro',
                    category: 'games',
                    parameters: ['playerMode', 'difficulty', 'timeControl']
                },
                {
                    id: 'create_puzzle_game',
                    name: 'Ugankarska igra',
                    description: 'Ustvari logične uganke in izzive',
                    category: 'games',
                    parameters: ['puzzleType', 'difficulty', 'timeLimit']
                }
            ],
            diagnostics: [
                {
                    id: 'diagnose_machine_errors',
                    name: 'Diagnostika strojev',
                    description: 'Analiziraj napake in težave strojev',
                    category: 'diagnostics',
                    parameters: ['machineId', 'errorCodes', 'sensorData']
                },
                {
                    id: 'auto_fix_system',
                    name: 'Avtomatski popravki',
                    description: 'Samodejno popravi sistemske napake',
                    category: 'diagnostics',
                    parameters: ['systemType', 'errorLevel', 'backupRequired']
                },
                {
                    id: 'performance_analysis',
                    name: 'Analiza učinkovitosti',
                    description: 'Analiziraj delovanje sistema in predlagaj izboljšave',
                    category: 'diagnostics',
                    parameters: ['systemMetrics', 'timeRange', 'analysisType']
                }
            ],
            business: [
                {
                    id: 'create_business_plan',
                    name: 'Poslovni načrt',
                    description: 'Ustvari celovit poslovni načrt',
                    category: 'business',
                    parameters: ['businessType', 'market', 'financials']
                },
                {
                    id: 'marketing_campaign',
                    name: 'Marketinška kampanja',
                    description: 'Načrtuj in izvedi marketinško kampanjo',
                    category: 'business',
                    parameters: ['target', 'budget', 'channels', 'goals']
                }
            ],
            technical: [
                {
                    id: 'code_generator',
                    name: 'Generator kode',
                    description: 'Generiraj kodo za različne programske jezike',
                    category: 'technical',
                    parameters: ['language', 'functionality', 'framework']
                },
                {
                    id: 'api_integration',
                    name: 'API integracija',
                    description: 'Integriraj zunanje API storitve',
                    category: 'technical',
                    parameters: ['apiType', 'endpoints', 'authentication']
                }
            ]
        };
    }

    initializeActions() {
        // Dokumenti in obrazci
        this.registerDocumentActions();
        
        // Igre
        this.registerGameActions();
        
        // Diagnostika
        this.registerDiagnosticActions();
        
        // Poslovne aplikacije
        this.registerBusinessActions();
        
        // Tehnične aplikacije
        this.registerTechnicalActions();
    }

    registerDocumentActions() {
        // Uradni obrazci
        this.actions.set('create_vehicle_sale_form', {
            name: 'Ustvari obrazec za prodajo vozila',
            category: 'documents',
            description: 'Generira uradni obrazec za prodajo motornega vozila',
            execute: (params) => this.createVehicleSaleForm(params),
            parameters: ['sellerName', 'buyerName', 'vehicleData', 'price']
        });

        this.actions.set('create_contract', {
            name: 'Ustvari pogodbo',
            category: 'documents', 
            description: 'Generira pravno veljavno pogodbo',
            execute: (params) => this.createContract(params),
            parameters: ['contractType', 'parties', 'terms', 'date']
        });

        this.actions.set('create_invoice', {
            name: 'Ustvari račun',
            category: 'documents',
            description: 'Generira profesionalen račun',
            execute: (params) => this.createInvoice(params),
            parameters: ['company', 'client', 'items', 'total']
        });

        this.actions.set('print_document', {
            name: 'Natisni dokument',
            category: 'documents',
            description: 'Pripravi dokument za tiskanje',
            execute: (params) => this.printDocument(params),
            parameters: ['documentId', 'printerSettings']
        });
    }

    registerGameActions() {
        this.actions.set('create_chess_game', {
            name: 'Ustvari šahovsko igro',
            category: 'games',
            description: 'Zažene interaktivno šahovsko igro',
            execute: (params) => this.createChessGame(params),
            parameters: ['playerMode', 'difficulty', 'timeControl']
        });

        this.actions.set('create_puzzle_game', {
            name: 'Ustvari ugankarske igre',
            category: 'games',
            description: 'Generira različne ugankarske izzive',
            execute: (params) => this.createPuzzleGame(params),
            parameters: ['puzzleType', 'difficulty', 'size']
        });

        this.actions.set('create_quiz_app', {
            name: 'Ustvari kviz aplikacijo',
            category: 'games',
            description: 'Interaktivni kviz z različnimi temami',
            execute: (params) => this.createQuizApp(params),
            parameters: ['topic', 'questionCount', 'difficulty']
        });
    }

    registerDiagnosticActions() {
        this.actions.set('diagnose_machine_errors', {
            name: 'Diagnosticiraj napake strojev',
            category: 'diagnostics',
            description: 'Analizira in diagnosticira napake v proizvodnih strojih',
            execute: (params) => this.diagnoseMachineErrors(params),
            parameters: ['machineId', 'errorCodes', 'sensorData']
        });

        this.actions.set('auto_fix_system', {
            name: 'Avtomatsko popravi sistem',
            category: 'diagnostics',
            description: 'Avtomatsko zazna in popravi sistemske napake',
            execute: (params) => this.autoFixSystem(params),
            parameters: ['systemType', 'errorLevel', 'backupRequired']
        });

        this.actions.set('network_diagnostics', {
            name: 'Mrežna diagnostika',
            category: 'diagnostics',
            description: 'Preveri in popravi mrežne povezave',
            execute: (params) => this.networkDiagnostics(params),
            parameters: ['networkType', 'targetHosts', 'testType']
        });

        this.actions.set('performance_analysis', {
            name: 'Analiza zmogljivosti',
            category: 'diagnostics',
            description: 'Analizira zmogljivost sistema in predlaga optimizacije',
            execute: (params) => this.performanceAnalysis(params),
            parameters: ['systemComponents', 'timeRange', 'metrics']
        });
    }

    registerBusinessActions() {
        this.actions.set('crm_integration', {
            name: 'CRM integracija',
            category: 'business',
            description: 'Integrira s CRM sistemi za upravljanje strank',
            execute: (params) => this.crmIntegration(params),
            parameters: ['crmType', 'customerData', 'syncOptions']
        });

        this.actions.set('inventory_management', {
            name: 'Upravljanje zalog',
            category: 'business',
            description: 'Avtomatsko upravljanje zalog in naročil',
            execute: (params) => this.inventoryManagement(params),
            parameters: ['warehouseId', 'products', 'thresholds']
        });
    }

    registerTechnicalActions() {
        this.actions.set('code_generation', {
            name: 'Generiranje kode',
            category: 'technical',
            description: 'Avtomatsko generira kodo za različne platforme',
            execute: (params) => this.codeGeneration(params),
            parameters: ['language', 'framework', 'specifications']
        });

        this.actions.set('api_integration', {
            name: 'API integracija',
            category: 'technical',
            description: 'Avtomatsko integrira z zunanjimi API-ji',
            execute: (params) => this.apiIntegration(params),
            parameters: ['apiUrl', 'authentication', 'endpoints']
        });
    }

    // Implementacije dejanj

    async createVehicleSaleForm(params) {
        const { sellerName, buyerName, vehicleData, price } = params;
        
        const formTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Obrazec za prodajo motornega vozila</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin: 20px 0; }
                .field { margin: 10px 0; }
                .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                .print-btn { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>OBRAZEC ZA PRODAJO MOTORNEGA VOZILA</h1>
                <p>Datum: ${new Date().toLocaleDateString('sl-SI')}</p>
            </div>
            
            <div class="section">
                <h3>PODATKI O PRODAJALCU</h3>
                <div class="field">Ime in priimek: ${sellerName}</div>
                <div class="field">Naslov: _________________________</div>
                <div class="field">Telefon: _________________________</div>
            </div>
            
            <div class="section">
                <h3>PODATKI O KUPCU</h3>
                <div class="field">Ime in priimek: ${buyerName}</div>
                <div class="field">Naslov: _________________________</div>
                <div class="field">Telefon: _________________________</div>
            </div>
            
            <div class="section">
                <h3>PODATKI O VOZILU</h3>
                <div class="field">Znamka in model: ${vehicleData.brand} ${vehicleData.model}</div>
                <div class="field">Letnik: ${vehicleData.year}</div>
                <div class="field">Registrska številka: ${vehicleData.registration}</div>
                <div class="field">Številka šasije: ${vehicleData.vin}</div>
                <div class="field">Prevoženi kilometri: ${vehicleData.mileage} km</div>
            </div>
            
            <div class="section">
                <h3>PRODAJNA CENA</h3>
                <div class="field">Dogovorjena cena: ${price} EUR</div>
                <div class="field">Način plačila: _________________________</div>
            </div>
            
            <div class="signature">
                <div>
                    <p>Podpis prodajalca:</p>
                    <p>_________________________</p>
                </div>
                <div>
                    <p>Podpis kupca:</p>
                    <p>_________________________</p>
                </div>
            </div>
            
            <button class="print-btn" onclick="window.print()">🖨️ Natisni obrazec</button>
        </body>
        </html>
        `;

        return {
            success: true,
            document: formTemplate,
            type: 'vehicle_sale_form',
            timestamp: new Date().toISOString(),
            printReady: true
        };
    }

    async createChessGame(params) {
        const { playerMode = 'human_vs_ai', difficulty = 'medium', timeControl = 'unlimited' } = params;
        
        const chessGameHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Omnija Šah</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
                .chess-container { max-width: 600px; margin: 0 auto; }
                .chess-board { 
                    display: grid; 
                    grid-template-columns: repeat(8, 60px);
                    grid-template-rows: repeat(8, 60px);
                    border: 2px solid #333;
                    margin: 20px auto;
                }
                .chess-square { 
                    width: 60px; 
                    height: 60px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-size: 40px;
                    cursor: pointer;
                    user-select: none;
                }
                .white-square { background: #f0d9b5; }
                .black-square { background: #b58863; }
                .selected { background: #7fb069 !important; }
                .possible-move { background: #87ceeb !important; }
                .game-info { text-align: center; margin: 20px 0; }
                .controls { text-align: center; margin: 20px 0; }
                .btn { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; cursor: pointer; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="chess-container">
                <h1>🏆 Omnija Šah</h1>
                <div class="game-info">
                    <p>Način: ${playerMode} | Težavnost: ${difficulty} | Čas: ${timeControl}</p>
                    <p id="game-status">Na potezi: Beli</p>
                </div>
                
                <div class="chess-board" id="chessBoard"></div>
                
                <div class="controls">
                    <button class="btn" onclick="newGame()">🔄 Nova igra</button>
                    <button class="btn" onclick="undoMove()">↶ Razveljavi</button>
                    <button class="btn" onclick="getHint()">💡 Namig</button>
                    <button class="btn" onclick="saveGame()">💾 Shrani</button>
                </div>
                
                <div id="move-history">
                    <h3>Zgodovina potez:</h3>
                    <div id="moves"></div>
                </div>
            </div>

            <script>
                class ChessGame {
                    constructor() {
                        this.board = this.initializeBoard();
                        this.currentPlayer = 'white';
                        this.selectedSquare = null;
                        this.moveHistory = [];
                        this.gameStatus = 'active';
                        this.renderBoard();
                    }

                    initializeBoard() {
                        return [
                            ['♜','♞','♝','♛','♚','♝','♞','♜'],
                            ['♟','♟','♟','♟','♟','♟','♟','♟'],
                            ['','','','','','','',''],
                            ['','','','','','','',''],
                            ['','','','','','','',''],
                            ['','','','','','','',''],
                            ['♙','♙','♙','♙','♙','♙','♙','♙'],
                            ['♖','♘','♗','♕','♔','♗','♘','♖']
                        ];
                    }

                    renderBoard() {
                        const boardElement = document.getElementById('chessBoard');
                        boardElement.innerHTML = '';
                        
                        for (let row = 0; row < 8; row++) {
                            for (let col = 0; col < 8; col++) {
                                const square = document.createElement('div');
                                square.className = 'chess-square ' + ((row + col) % 2 === 0 ? 'white-square' : 'black-square');
                                square.textContent = this.board[row][col];
                                square.onclick = () => this.handleSquareClick(row, col);
                                square.dataset.row = row;
                                square.dataset.col = col;
                                boardElement.appendChild(square);
                            }
                        }
                    }

                    handleSquareClick(row, col) {
                        if (this.selectedSquare) {
                            this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
                            this.clearSelection();
                        } else if (this.board[row][col] !== '') {
                            this.selectSquare(row, col);
                        }
                    }

                    selectSquare(row, col) {
                        this.selectedSquare = { row, col };
                        document.querySelector(\`[data-row="\${row}"][data-col="\${col}"]\`).classList.add('selected');
                    }

                    clearSelection() {
                        document.querySelectorAll('.selected, .possible-move').forEach(el => {
                            el.classList.remove('selected', 'possible-move');
                        });
                        this.selectedSquare = null;
                    }

                    makeMove(fromRow, fromCol, toRow, toCol) {
                        const piece = this.board[fromRow][fromCol];
                        const capturedPiece = this.board[toRow][toCol];
                        
                        this.board[toRow][toCol] = piece;
                        this.board[fromRow][fromCol] = '';
                        
                        this.moveHistory.push({
                            from: { row: fromRow, col: fromCol },
                            to: { row: toRow, col: toCol },
                            piece: piece,
                            captured: capturedPiece
                        });
                        
                        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
                        document.getElementById('game-status').textContent = \`Na potezi: \${this.currentPlayer === 'white' ? 'Beli' : 'Črni'}\`;
                        
                        this.renderBoard();
                        this.updateMoveHistory();
                    }

                    updateMoveHistory() {
                        const movesElement = document.getElementById('moves');
                        movesElement.innerHTML = this.moveHistory.map((move, index) => 
                            \`<div>\${index + 1}. \${move.piece} \${String.fromCharCode(97 + move.from.col)}\${8 - move.from.row} → \${String.fromCharCode(97 + move.to.col)}\${8 - move.to.row}</div>\`
                        ).join('');
                    }
                }

                let game = new ChessGame();

                function newGame() {
                    game = new ChessGame();
                }

                function undoMove() {
                    if (game.moveHistory.length > 0) {
                        const lastMove = game.moveHistory.pop();
                        game.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
                        game.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
                        game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
                        game.renderBoard();
                        game.updateMoveHistory();
                    }
                }

                function getHint() {
                    alert('💡 Namig: Poskusite zaščititi svojega kralja in napadati nasprotnikove figure!');
                }

                function saveGame() {
                    const gameData = {
                        board: game.board,
                        currentPlayer: game.currentPlayer,
                        moveHistory: game.moveHistory,
                        timestamp: new Date().toISOString()
                    };
                    localStorage.setItem('omnija_chess_save', JSON.stringify(gameData));
                    alert('💾 Igra je bila shranjena!');
                }
            </script>
        </body>
        </html>
        `;

        return {
            success: true,
            game: chessGameHTML,
            type: 'chess_game',
            playerMode: playerMode,
            difficulty: difficulty,
            timeControl: timeControl,
            playable: true
        };
    }

    async diagnoseMachineErrors(params) {
        const { machineId, errorCodes, sensorData } = params;
        
        const diagnosticResults = {
            machineId: machineId,
            timestamp: new Date().toISOString(),
            status: 'analyzed',
            errors: [],
            recommendations: [],
            autoFixAvailable: false
        };

        // Simulacija analize napak
        if (errorCodes && errorCodes.length > 0) {
            errorCodes.forEach(code => {
                let error = { code: code, severity: 'medium', description: '', solution: '' };
                
                switch (code) {
                    case 'E001':
                        error.description = 'Previsoka temperatura motorja';
                        error.severity = 'high';
                        error.solution = 'Preverite hladilni sistem in zamenjajte filter';
                        error.autoFixAvailable = true;
                        break;
                    case 'E002':
                        error.description = 'Nizek tlak olja';
                        error.severity = 'critical';
                        error.solution = 'Takoj ustavite stroj in preverite nivo olja';
                        break;
                    case 'E003':
                        error.description = 'Vibracije nad dovoljeno mejo';
                        error.severity = 'medium';
                        error.solution = 'Preverite ležaje in izravnajte rotor';
                        break;
                    default:
                        error.description = 'Neznana napaka';
                        error.solution = 'Kontaktirajte tehnično podporo';
                }
                
                diagnosticResults.errors.push(error);
            });
        }

        // Analiza senzorskih podatkov
        if (sensorData) {
            if (sensorData.temperature > 80) {
                diagnosticResults.recommendations.push('Zmanjšajte obremenitev stroja zaradi visoke temperature');
            }
            if (sensorData.vibration > 5) {
                diagnosticResults.recommendations.push('Preverite mehanične komponente zaradi vibrацij');
            }
            if (sensorData.pressure < 2) {
                diagnosticResults.recommendations.push('Povišajte tlak v sistemu');
            }
        }

        diagnosticResults.autoFixAvailable = diagnosticResults.errors.some(e => e.autoFixAvailable);

        return {
            success: true,
            diagnostics: diagnosticResults,
            type: 'machine_diagnostics',
            actionRequired: diagnosticResults.errors.some(e => e.severity === 'critical'),
            autoFixOptions: diagnosticResults.errors.filter(e => e.autoFixAvailable)
        };
    }

    async autoFixSystem(params) {
        const { systemType, errorLevel, backupRequired = true } = params;
        
        const fixResults = {
            systemType: systemType,
            timestamp: new Date().toISOString(),
            backupCreated: backupRequired,
            fixesApplied: [],
            status: 'completed',
            errors: []
        };

        // Simulacija avtomatskih popravkov
        const commonFixes = [
            'Počiščeni začasni datoteki',
            'Obnovljene mrežne povezave', 
            'Posodobljeni gonilniki',
            'Optimizirane sistemske nastavitve',
            'Popravljene registrske napake',
            'Defragmentirani diski'
        ];

        // Dodaj popravke glede na nivo napake
        const fixCount = errorLevel === 'critical' ? 6 : errorLevel === 'high' ? 4 : 2;
        fixResults.fixesApplied = commonFixes.slice(0, fixCount);

        if (backupRequired) {
            fixResults.backupLocation = `C:\\Omnija\\Backups\\${systemType}_${Date.now()}.bak`;
        }

        return {
            success: true,
            fixes: fixResults,
            type: 'auto_system_fix',
            rebootRequired: errorLevel === 'critical',
            estimatedTime: `${fixCount * 2} minut`
        };
    }

    // Glavne metode za izvajanje

    async executeAction(actionId, parameters = {}) {
        if (!this.actions.has(actionId)) {
            return {
                success: false,
                error: `Dejanje '${actionId}' ni najdeno`
            };
        }

        const action = this.actions.get(actionId);
        
        try {
            console.log(`🎯 Izvajam dejanje: ${action.name}`);
            const result = await action.execute(parameters);
            
            return {
                success: true,
                actionId: actionId,
                actionName: action.name,
                result: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Napaka pri izvajanju dejanja ${actionId}:`, error);
            return {
                success: false,
                error: error.message,
                actionId: actionId
            };
        }
    }

    getAvailableActions(category = null) {
        const actions = Array.from(this.actions.entries()).map(([id, action]) => ({
            id: id,
            name: action.name,
            category: action.category,
            description: action.description,
            parameters: action.parameters
        }));

        if (category) {
            return actions.filter(action => action.category === category);
        }

        return actions;
    }

    getActionsByCategory() {
        const categories = {};
        
        this.actions.forEach((action, id) => {
            if (!categories[action.category]) {
                categories[action.category] = [];
            }
            categories[action.category].push({
                id: id,
                name: action.name,
                description: action.description,
                parameters: action.parameters
            });
        });

        return categories;
    }
}

// Export za uporabo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecutableActions;
}

// Global dostop v brskalniku
if (typeof window !== 'undefined') {
    window.ExecutableActions = ExecutableActions;
}

console.log('🎯 Executable Actions System loaded');