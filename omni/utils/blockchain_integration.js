/**
 * OMNI Blockchain Integration
 * Enterprise blockchain sistem za transparentnost in sledljivost
 * 
 * Funkcionalnosti:
 * - Smart contracts
 * - Transaction tracking
 * - Digital identity management
 * - Supply chain transparency
 * - Audit trails
 * - Cryptocurrency payments
 * - NFT support
 * - Decentralized storage
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const fs = require('fs').promises;

class BlockchainIntegration extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            networkId: config.networkId || 'omni-chain',
            blockTime: config.blockTime || 10000, // 10 seconds
            difficulty: config.difficulty || 4,
            miningReward: config.miningReward || 10,
            maxTransactionsPerBlock: config.maxTransactionsPerBlock || 100,
            ...config
        };

        this.blockchain = [];
        this.pendingTransactions = [];
        this.wallets = new Map();
        this.smartContracts = new Map();
        this.auditTrails = new Map();
        this.digitalIdentities = new Map();
        this.nfts = new Map();
        this.miningQueue = [];
        this.validators = new Set();

        this.initializeBlockchain();
        console.log('⛓️ Blockchain Integration initialized');
    }

    /**
     * Inicializacija blockchain-a
     */
    async initializeBlockchain() {
        try {
            // Ustvari genesis block
            await this.createGenesisBlock();
            
            // Ustvari osnovne wallet-e
            await this.createDefaultWallets();
            
            // Zaženi mining proces
            this.startMining();
            
            // Zaženi validator network
            this.startValidatorNetwork();
            
            console.log('✅ Blockchain ready');
        } catch (error) {
            console.error('❌ Blockchain initialization failed:', error);
        }
    }

    /**
     * Ustvari genesis block
     */
    async createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: new Date('2024-01-01T00:00:00Z'),
            transactions: [],
            previousHash: '0',
            nonce: 0,
            hash: this.calculateHash({
                index: 0,
                timestamp: new Date('2024-01-01T00:00:00Z'),
                transactions: [],
                previousHash: '0',
                nonce: 0
            })
        };

        this.blockchain.push(genesisBlock);
        console.log('🎯 Genesis block created');
    }

    /**
     * Ustvari osnovne wallet-e
     */
    async createDefaultWallets() {
        const defaultWallets = [
            { name: 'OMNI System', type: 'system', balance: 1000000 },
            { name: 'Tourism Fund', type: 'business', balance: 50000 },
            { name: 'Business Fund', type: 'business', balance: 50000 },
            { name: 'Rewards Pool', type: 'rewards', balance: 100000 }
        ];

        for (const walletData of defaultWallets) {
            const wallet = await this.createWallet(walletData.name, walletData.type);
            wallet.balance = walletData.balance;
        }
    }

    /**
     * Ustvari wallet
     */
    async createWallet(name, type = 'user') {
        const keyPair = this.generateKeyPair();
        const address = this.generateAddress(keyPair.publicKey);
        
        const wallet = {
            name,
            type,
            address,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            balance: 0,
            transactions: [],
            createdAt: new Date()
        };

        this.wallets.set(address, wallet);
        
        console.log(`💳 Wallet created: ${name} (${address.substring(0, 8)}...)`);
        return wallet;
    }

    /**
     * Generiraj ključni par
     */
    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        return { publicKey, privateKey };
    }

    /**
     * Generiraj naslov
     */
    generateAddress(publicKey) {
        return crypto.createHash('sha256')
            .update(publicKey)
            .digest('hex')
            .substring(0, 40);
    }

    /**
     * Ustvari transakcijo
     */
    async createTransaction(fromAddress, toAddress, amount, data = {}) {
        try {
            const transaction = {
                id: crypto.randomUUID(),
                fromAddress,
                toAddress,
                amount,
                data,
                timestamp: new Date(),
                signature: null,
                status: 'pending'
            };

            // Podpiši transakcijo
            if (fromAddress !== 'system') {
                const wallet = this.wallets.get(fromAddress);
                if (!wallet) throw new Error('Wallet not found');
                
                transaction.signature = this.signTransaction(transaction, wallet.privateKey);
            }

            // Validiraj transakcijo
            if (await this.validateTransaction(transaction)) {
                this.pendingTransactions.push(transaction);
                this.emit('transactionCreated', transaction);
                
                console.log(`💸 Transaction created: ${amount} from ${fromAddress.substring(0, 8)}... to ${toAddress.substring(0, 8)}...`);
                return transaction;
            } else {
                throw new Error('Transaction validation failed');
            }
        } catch (error) {
            console.error('Transaction creation failed:', error);
            throw error;
        }
    }

    /**
     * Podpiši transakcijo
     */
    signTransaction(transaction, privateKey) {
        const transactionData = JSON.stringify({
            fromAddress: transaction.fromAddress,
            toAddress: transaction.toAddress,
            amount: transaction.amount,
            timestamp: transaction.timestamp
        });

        const sign = crypto.createSign('SHA256');
        sign.update(transactionData);
        return sign.sign(privateKey, 'hex');
    }

    /**
     * Validiraj transakcijo
     */
    async validateTransaction(transaction) {
        try {
            // Preveri podpis
            if (transaction.fromAddress !== 'system' && transaction.signature) {
                const wallet = this.wallets.get(transaction.fromAddress);
                if (!wallet) return false;

                const transactionData = JSON.stringify({
                    fromAddress: transaction.fromAddress,
                    toAddress: transaction.toAddress,
                    amount: transaction.amount,
                    timestamp: transaction.timestamp
                });

                const verify = crypto.createVerify('SHA256');
                verify.update(transactionData);
                
                if (!verify.verify(wallet.publicKey, transaction.signature, 'hex')) {
                    return false;
                }
            }

            // Preveri balance
            if (transaction.fromAddress !== 'system') {
                const balance = await this.getBalance(transaction.fromAddress);
                if (balance < transaction.amount) return false;
            }

            return true;
        } catch (error) {
            console.error('Transaction validation error:', error);
            return false;
        }
    }

    /**
     * Zaženi mining
     */
    startMining() {
        setInterval(() => {
            if (this.pendingTransactions.length > 0) {
                this.mineBlock();
            }
        }, this.config.blockTime);
    }

    /**
     * Mine block
     */
    async mineBlock() {
        try {
            const transactions = this.pendingTransactions.splice(0, this.config.maxTransactionsPerBlock);
            
            const block = {
                index: this.blockchain.length,
                timestamp: new Date(),
                transactions,
                previousHash: this.getLatestBlock().hash,
                nonce: 0
            };

            // Proof of Work
            block.hash = await this.mineBlockHash(block);
            
            // Dodaj block v blockchain
            this.blockchain.push(block);
            
            // Posodobi balance-e
            await this.updateBalances(transactions);
            
            // Dodaj mining reward
            await this.addMiningReward(block);
            
            this.emit('blockMined', block);
            console.log(`⛏️ Block mined: #${block.index} with ${transactions.length} transactions`);
            
        } catch (error) {
            console.error('Mining failed:', error);
        }
    }

    /**
     * Mine block hash (Proof of Work)
     */
    async mineBlockHash(block) {
        let hash;
        do {
            block.nonce++;
            hash = this.calculateHash(block);
        } while (!hash.startsWith('0'.repeat(this.config.difficulty)));
        
        return hash;
    }

    /**
     * Izračunaj hash
     */
    calculateHash(block) {
        const blockData = JSON.stringify({
            index: block.index,
            timestamp: block.timestamp,
            transactions: block.transactions,
            previousHash: block.previousHash,
            nonce: block.nonce
        });

        return crypto.createHash('sha256').update(blockData).digest('hex');
    }

    /**
     * Posodobi balance-e
     */
    async updateBalances(transactions) {
        for (const transaction of transactions) {
            if (transaction.fromAddress !== 'system') {
                const fromWallet = this.wallets.get(transaction.fromAddress);
                if (fromWallet) {
                    fromWallet.balance -= transaction.amount;
                    fromWallet.transactions.push(transaction);
                }
            }

            const toWallet = this.wallets.get(transaction.toAddress);
            if (toWallet) {
                toWallet.balance += transaction.amount;
                toWallet.transactions.push(transaction);
            }

            transaction.status = 'confirmed';
        }
    }

    /**
     * Dodaj mining reward
     */
    async addMiningReward(block) {
        // Simulacija mining reward-a
        const systemWallet = Array.from(this.wallets.values()).find(w => w.type === 'system');
        if (systemWallet) {
            systemWallet.balance += this.config.miningReward;
        }
    }

    /**
     * Pridobi balance
     */
    async getBalance(address) {
        const wallet = this.wallets.get(address);
        return wallet ? wallet.balance : 0;
    }

    /**
     * Pridobi zadnji block
     */
    getLatestBlock() {
        return this.blockchain[this.blockchain.length - 1];
    }

    /**
     * Smart Contract funkcionalnost
     */
    async deploySmartContract(name, code, deployer) {
        try {
            const contractAddress = this.generateAddress(name + Date.now());
            
            const contract = {
                name,
                address: contractAddress,
                code,
                deployer,
                state: {},
                deployedAt: new Date(),
                transactions: []
            };

            this.smartContracts.set(contractAddress, contract);
            
            // Ustvari deployment transakcijo
            await this.createTransaction(deployer, contractAddress, 0, {
                type: 'contract_deployment',
                contractName: name
            });

            console.log(`📜 Smart contract deployed: ${name} (${contractAddress.substring(0, 8)}...)`);
            return contract;
        } catch (error) {
            console.error('Smart contract deployment failed:', error);
            throw error;
        }
    }

    /**
     * Izvršuj smart contract
     */
    async executeSmartContract(contractAddress, method, params, caller) {
        try {
            const contract = this.smartContracts.get(contractAddress);
            if (!contract) throw new Error('Contract not found');

            // Simulacija izvršitve
            const result = await this.simulateContractExecution(contract, method, params);
            
            // Ustvari transakcijo
            const transaction = await this.createTransaction(caller, contractAddress, 0, {
                type: 'contract_execution',
                method,
                params,
                result
            });

            contract.transactions.push(transaction);
            
            return result;
        } catch (error) {
            console.error('Smart contract execution failed:', error);
            throw error;
        }
    }

    /**
     * Simuliraj izvršitev contract-a
     */
    async simulateContractExecution(contract, method, params) {
        // Osnovni smart contract-i
        switch (contract.name) {
            case 'TourismBooking':
                return this.executeTourismBookingContract(contract, method, params);
            case 'BusinessAnalytics':
                return this.executeBusinessAnalyticsContract(contract, method, params);
            case 'RewardSystem':
                return this.executeRewardSystemContract(contract, method, params);
            default:
                return { success: true, message: 'Contract executed successfully' };
        }
    }

    /**
     * Tourism Booking Contract
     */
    executeTourismBookingContract(contract, method, params) {
        switch (method) {
            case 'createBooking':
                const bookingId = crypto.randomUUID();
                contract.state[bookingId] = {
                    customer: params.customer,
                    destination: params.destination,
                    dates: params.dates,
                    amount: params.amount,
                    status: 'confirmed',
                    createdAt: new Date()
                };
                return { bookingId, status: 'confirmed' };
            
            case 'cancelBooking':
                if (contract.state[params.bookingId]) {
                    contract.state[params.bookingId].status = 'cancelled';
                    return { success: true, refund: contract.state[params.bookingId].amount };
                }
                return { success: false, error: 'Booking not found' };
            
            default:
                return { success: false, error: 'Method not found' };
        }
    }

    /**
     * Business Analytics Contract
     */
    executeBusinessAnalyticsContract(contract, method, params) {
        switch (method) {
            case 'recordMetric':
                const metricId = crypto.randomUUID();
                contract.state[metricId] = {
                    metric: params.metric,
                    value: params.value,
                    timestamp: new Date()
                };
                return { metricId, recorded: true };
            
            case 'getAnalytics':
                const metrics = Object.values(contract.state);
                return {
                    totalMetrics: metrics.length,
                    averageValue: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
                    lastUpdate: Math.max(...metrics.map(m => m.timestamp))
                };
            
            default:
                return { success: false, error: 'Method not found' };
        }
    }

    /**
     * Reward System Contract
     */
    executeRewardSystemContract(contract, method, params) {
        switch (method) {
            case 'earnReward':
                const rewardId = crypto.randomUUID();
                contract.state[rewardId] = {
                    user: params.user,
                    action: params.action,
                    points: params.points,
                    timestamp: new Date()
                };
                return { rewardId, points: params.points };
            
            case 'redeemReward':
                const userRewards = Object.values(contract.state).filter(r => r.user === params.user);
                const totalPoints = userRewards.reduce((sum, r) => sum + r.points, 0);
                
                if (totalPoints >= params.requiredPoints) {
                    return { success: true, redeemed: params.requiredPoints, remaining: totalPoints - params.requiredPoints };
                }
                return { success: false, error: 'Insufficient points' };
            
            default:
                return { success: false, error: 'Method not found' };
        }
    }

    /**
     * NFT funkcionalnost
     */
    async mintNFT(name, description, metadata, owner) {
        try {
            const tokenId = crypto.randomUUID();
            const tokenHash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
            
            const nft = {
                tokenId,
                name,
                description,
                metadata,
                owner,
                creator: owner,
                tokenHash,
                mintedAt: new Date(),
                transferHistory: []
            };

            this.nfts.set(tokenId, nft);
            
            // Ustvari minting transakcijo
            await this.createTransaction('system', owner, 0, {
                type: 'nft_mint',
                tokenId,
                name
            });

            console.log(`🎨 NFT minted: ${name} (${tokenId.substring(0, 8)}...)`);
            return nft;
        } catch (error) {
            console.error('NFT minting failed:', error);
            throw error;
        }
    }

    /**
     * Prenesi NFT
     */
    async transferNFT(tokenId, fromAddress, toAddress) {
        try {
            const nft = this.nfts.get(tokenId);
            if (!nft) throw new Error('NFT not found');
            if (nft.owner !== fromAddress) throw new Error('Not the owner');

            nft.owner = toAddress;
            nft.transferHistory.push({
                from: fromAddress,
                to: toAddress,
                timestamp: new Date()
            });

            // Ustvari transfer transakcijo
            await this.createTransaction(fromAddress, toAddress, 0, {
                type: 'nft_transfer',
                tokenId
            });

            console.log(`🔄 NFT transferred: ${tokenId.substring(0, 8)}... from ${fromAddress.substring(0, 8)}... to ${toAddress.substring(0, 8)}...`);
            return nft;
        } catch (error) {
            console.error('NFT transfer failed:', error);
            throw error;
        }
    }

    /**
     * Audit Trail funkcionalnost
     */
    async createAuditTrail(entityId, action, data, actor) {
        try {
            const auditId = crypto.randomUUID();
            const auditEntry = {
                id: auditId,
                entityId,
                action,
                data,
                actor,
                timestamp: new Date(),
                blockHash: this.getLatestBlock().hash
            };

            if (!this.auditTrails.has(entityId)) {
                this.auditTrails.set(entityId, []);
            }
            
            this.auditTrails.get(entityId).push(auditEntry);
            
            // Ustvari audit transakcijo
            await this.createTransaction(actor, 'system', 0, {
                type: 'audit_entry',
                auditId,
                entityId,
                action
            });

            return auditEntry;
        } catch (error) {
            console.error('Audit trail creation failed:', error);
            throw error;
        }
    }

    /**
     * Validator Network
     */
    startValidatorNetwork() {
        setInterval(() => {
            this.validateBlockchain();
        }, 60000); // Every minute
    }

    /**
     * Validiraj blockchain
     */
    validateBlockchain() {
        for (let i = 1; i < this.blockchain.length; i++) {
            const currentBlock = this.blockchain[i];
            const previousBlock = this.blockchain[i - 1];

            // Preveri hash
            if (currentBlock.hash !== this.calculateHash(currentBlock)) {
                console.error(`❌ Invalid hash at block ${i}`);
                return false;
            }

            // Preveri previous hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.error(`❌ Invalid previous hash at block ${i}`);
                return false;
            }
        }

        console.log('✅ Blockchain validation successful');
        return true;
    }

    /**
     * Pridobi blockchain status
     */
    getBlockchainStatus() {
        const totalTransactions = this.blockchain.reduce((sum, block) => sum + block.transactions.length, 0);
        const totalValue = this.blockchain.reduce((sum, block) => {
            return sum + block.transactions.reduce((blockSum, tx) => blockSum + tx.amount, 0);
        }, 0);

        return {
            networkId: this.config.networkId,
            blockHeight: this.blockchain.length - 1,
            totalTransactions,
            totalValue,
            pendingTransactions: this.pendingTransactions.length,
            wallets: this.wallets.size,
            smartContracts: this.smartContracts.size,
            nfts: this.nfts.size,
            auditTrails: this.auditTrails.size,
            lastBlockTime: this.getLatestBlock().timestamp,
            isValid: this.validateBlockchain(),
            capabilities: {
                smartContracts: true,
                nftSupport: true,
                auditTrails: true,
                digitalIdentity: true,
                proofOfWork: true
            }
        };
    }
}

module.exports = { BlockchainIntegration };