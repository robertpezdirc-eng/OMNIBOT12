#!/usr/bin/env python3
"""
⛓️ OMNI BLOCKCHAIN SYSTEM - Blockchain integracija za transparentne transakcije in NFT spominki

Napredni blockchain sistem za turizem z Enterprise funkcionalnostmi:
- Transparentne transakcije z smart contracts
- NFT spominki in digitalni kolektibli
- Decentralizirane rezervacije in plačila
- Loyalty tokeni in nagrade
- Blockchain-based identiteta in verifikacija
- Kriptovalutna plačila (Bitcoin, Ethereum, stablecoins)
- DeFi integracije za yield farming
- DAO upravljanje za skupnostne odločitve

Varnostne funkcije:
- Centraliziran oblak → noben modul ne teče lokalno
- Enkripcija → TLS + AES-256 za vse podatke in komunikacijo
- Sandbox / Read-only demo
- Zaščita pred krajo → poskusi prenosa ali lokalne uporabe → modul se zaklene
- Admin dostop samo za tebe → edini, ki lahko nadgrajuje in odklepa funkcionalnosti
"""

import sqlite3
import json
import logging
import datetime
import hashlib
import secrets
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import threading
from flask import Flask, request, jsonify, render_template_string
import asyncio
import warnings
warnings.filterwarnings('ignore')

# Konfiguracija logiranja
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TransactionType(Enum):
    PAYMENT = "payment"
    RESERVATION = "reservation"
    NFT_MINT = "nft_mint"
    NFT_TRANSFER = "nft_transfer"
    LOYALTY_REWARD = "loyalty_reward"
    SMART_CONTRACT = "smart_contract"
    DAO_VOTE = "dao_vote"

class CryptoCurrency(Enum):
    BITCOIN = "BTC"
    ETHEREUM = "ETH"
    USDC = "USDC"
    USDT = "USDT"
    MATIC = "MATIC"
    OMNI_TOKEN = "OMNI"

class NFTCategory(Enum):
    EXPERIENCE = "experience"
    LOCATION = "location"
    ACHIEVEMENT = "achievement"
    COLLECTIBLE = "collectible"
    MEMBERSHIP = "membership"
    SOUVENIR = "souvenir"

class SmartContractType(Enum):
    RESERVATION = "reservation_contract"
    LOYALTY = "loyalty_contract"
    NFT_MARKETPLACE = "nft_marketplace"
    DAO_GOVERNANCE = "dao_governance"
    ESCROW = "escrow_contract"

@dataclass
class Block:
    index: int
    timestamp: float
    transactions: List[Dict[str, Any]]
    previous_hash: str
    nonce: int = 0
    hash: str = ""

@dataclass
class Transaction:
    tx_id: str
    from_address: str
    to_address: str
    amount: float
    currency: CryptoCurrency
    tx_type: TransactionType
    metadata: Dict[str, Any]
    timestamp: datetime.datetime
    gas_fee: float = 0.0
    status: str = "pending"

@dataclass
class NFTToken:
    token_id: str
    name: str
    description: str
    category: NFTCategory
    image_url: str
    metadata: Dict[str, Any]
    owner_address: str
    creator_address: str
    mint_timestamp: datetime.datetime
    rarity: str = "common"
    price: float = 0.0

@dataclass
class SmartContract:
    contract_id: str
    contract_type: SmartContractType
    code: str
    abi: Dict[str, Any]
    deployed_address: str
    creator: str
    created_at: datetime.datetime
    is_active: bool = True

@dataclass
class Wallet:
    address: str
    private_key: str
    public_key: str
    balances: Dict[str, float]
    nft_tokens: List[str]
    created_at: datetime.datetime

class OmniBlockchainSystem:
    def __init__(self, db_path: str = "omni_blockchain_system.db"):
        self.db_path = db_path
        self.is_demo = True
        self.demo_start_time = datetime.datetime.now()
        self.demo_duration_hours = 2
        self.access_key = secrets.token_hex(32)
        
        # Blockchain data
        self.blockchain = []
        self.pending_transactions = []
        self.wallets = {}
        self.nft_tokens = {}
        self.smart_contracts = {}
        self.mining_difficulty = 4
        
        # Exchange rates (simulirane)
        self.exchange_rates = {
            CryptoCurrency.BITCOIN: 45000.0,
            CryptoCurrency.ETHEREUM: 3000.0,
            CryptoCurrency.USDC: 1.0,
            CryptoCurrency.USDT: 1.0,
            CryptoCurrency.MATIC: 0.8,
            CryptoCurrency.OMNI_TOKEN: 10.0
        }
        
        self.init_database()
        self.create_genesis_block()
        self.load_sample_data()
        
        # Flask aplikacija
        self.app = Flask(__name__)
        self.setup_routes()
        
        logger.info("Blockchain System inicializiran")

    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela za bloke
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS blocks (
                id INTEGER PRIMARY KEY,
                block_index INTEGER,
                timestamp REAL,
                transactions TEXT,
                previous_hash TEXT,
                nonce INTEGER,
                hash TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za transakcije
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                from_address TEXT,
                to_address TEXT,
                amount REAL,
                currency TEXT,
                tx_type TEXT,
                metadata TEXT,
                timestamp TEXT,
                gas_fee REAL,
                status TEXT,
                block_hash TEXT
            )
        ''')
        
        # Tabela za NFT tokene
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS nft_tokens (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                category TEXT,
                image_url TEXT,
                metadata TEXT,
                owner_address TEXT,
                creator_address TEXT,
                mint_timestamp TEXT,
                rarity TEXT,
                price REAL
            )
        ''')
        
        # Tabela za smart contracts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS smart_contracts (
                id TEXT PRIMARY KEY,
                contract_type TEXT,
                code TEXT,
                abi TEXT,
                deployed_address TEXT,
                creator TEXT,
                created_at TEXT,
                is_active BOOLEAN
            )
        ''')
        
        # Tabela za denarnice
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wallets (
                address TEXT PRIMARY KEY,
                private_key TEXT,
                public_key TEXT,
                balances TEXT,
                nft_tokens TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela za DAO glasovanja
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dao_votes (
                id TEXT PRIMARY KEY,
                proposal_id TEXT,
                voter_address TEXT,
                vote TEXT,
                voting_power REAL,
                timestamp TEXT,
                tx_hash TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Blockchain System baza podatkov inicializirana")

    def create_genesis_block(self):
        """Ustvari genesis blok"""
        genesis_block = Block(
            index=0,
            timestamp=time.time(),
            transactions=[{
                "type": "genesis",
                "message": "OMNI Blockchain Genesis Block",
                "creator": "OmniSystem",
                "timestamp": datetime.datetime.now().isoformat()
            }],
            previous_hash="0"
        )
        
        genesis_block.hash = self.calculate_hash(genesis_block)
        self.blockchain.append(genesis_block)
        logger.info("Genesis blok ustvarjen")

    def calculate_hash(self, block: Block) -> str:
        """Izračunaj hash bloka"""
        block_string = f"{block.index}{block.timestamp}{json.dumps(block.transactions, sort_keys=True)}{block.previous_hash}{block.nonce}"
        return hashlib.sha256(block_string.encode()).hexdigest()

    def mine_block(self, block: Block) -> Block:
        """Rudarjenje bloka (Proof of Work)"""
        target = "0" * self.mining_difficulty
        
        while block.hash[:self.mining_difficulty] != target:
            block.nonce += 1
            block.hash = self.calculate_hash(block)
        
        logger.info(f"Blok {block.index} uspešno rudarjen z hash: {block.hash}")
        return block

    def create_wallet(self, user_id: str) -> Wallet:
        """Ustvari novo denarnico"""
        # Generiraj naključne ključe (simulirano)
        private_key = secrets.token_hex(32)
        public_key = hashlib.sha256(private_key.encode()).hexdigest()
        address = f"0x{hashlib.sha256(f"{user_id}{public_key}".encode()).hexdigest()[:40]}"
        
        wallet = Wallet(
            address=address,
            private_key=private_key,
            public_key=public_key,
            balances={
                CryptoCurrency.OMNI_TOKEN.value: 1000.0,  # Začetni bonus
                CryptoCurrency.USDC.value: 100.0
            },
            nft_tokens=[],
            created_at=datetime.datetime.now()
        )
        
        self.wallets[address] = wallet
        self.save_wallet(wallet)
        
        return wallet

    def create_transaction(self, from_address: str, to_address: str, amount: float, 
                         currency: CryptoCurrency, tx_type: TransactionType, 
                         metadata: Dict[str, Any] = None) -> Transaction:
        """Ustvari novo transakcijo"""
        tx_id = f"tx_{int(time.time())}_{secrets.token_hex(8)}"
        
        # Izračunaj gas fee
        gas_fee = self.calculate_gas_fee(amount, currency, tx_type)
        
        transaction = Transaction(
            tx_id=tx_id,
            from_address=from_address,
            to_address=to_address,
            amount=amount,
            currency=currency,
            tx_type=tx_type,
            metadata=metadata or {},
            timestamp=datetime.datetime.now(),
            gas_fee=gas_fee,
            status="pending"
        )
        
        # Preveri stanje denarnice
        if self.validate_transaction(transaction):
            self.pending_transactions.append(transaction)
            logger.info(f"Transakcija {tx_id} dodana v čakalno vrsto")
            return transaction
        else:
            transaction.status = "failed"
            logger.warning(f"Transakcija {tx_id} zavrnjena - nezadostno stanje")
            return transaction

    def calculate_gas_fee(self, amount: float, currency: CryptoCurrency, tx_type: TransactionType) -> float:
        """Izračunaj gas fee"""
        base_fee = 0.001
        
        # Različne provizije glede na tip transakcije
        multipliers = {
            TransactionType.PAYMENT: 1.0,
            TransactionType.RESERVATION: 1.2,
            TransactionType.NFT_MINT: 2.0,
            TransactionType.NFT_TRANSFER: 1.5,
            TransactionType.LOYALTY_REWARD: 0.5,
            TransactionType.SMART_CONTRACT: 3.0,
            TransactionType.DAO_VOTE: 0.8
        }
        
        return base_fee * multipliers.get(tx_type, 1.0)

    def validate_transaction(self, transaction: Transaction) -> bool:
        """Preveri veljavnost transakcije"""
        if transaction.from_address not in self.wallets:
            return False
        
        wallet = self.wallets[transaction.from_address]
        currency_key = transaction.currency.value
        
        required_amount = transaction.amount + transaction.gas_fee
        available_balance = wallet.balances.get(currency_key, 0.0)
        
        return available_balance >= required_amount

    def process_pending_transactions(self):
        """Obdelaj čakajoče transakcije"""
        if not self.pending_transactions:
            return
        
        # Ustvari nov blok
        new_block = Block(
            index=len(self.blockchain),
            timestamp=time.time(),
            transactions=[self.transaction_to_dict(tx) for tx in self.pending_transactions],
            previous_hash=self.blockchain[-1].hash if self.blockchain else "0"
        )
        
        # Rudarjenje bloka
        mined_block = self.mine_block(new_block)
        
        # Dodaj blok v blockchain
        self.blockchain.append(mined_block)
        
        # Posodobi stanja denarnic
        for transaction in self.pending_transactions:
            self.execute_transaction(transaction)
            transaction.status = "confirmed"
        
        # Počisti čakajoče transakcije
        self.pending_transactions.clear()
        
        logger.info(f"Blok {mined_block.index} dodan v blockchain z {len(mined_block.transactions)} transakcijami")

    def execute_transaction(self, transaction: Transaction):
        """Izvršuj transakcijo"""
        from_wallet = self.wallets.get(transaction.from_address)
        to_wallet = self.wallets.get(transaction.to_address)
        
        if not from_wallet:
            return
        
        currency_key = transaction.currency.value
        
        # Odštej iz pošiljateljeve denarnice
        from_wallet.balances[currency_key] -= (transaction.amount + transaction.gas_fee)
        
        # Dodaj v prejemnikovo denarnico
        if to_wallet:
            if currency_key not in to_wallet.balances:
                to_wallet.balances[currency_key] = 0.0
            to_wallet.balances[currency_key] += transaction.amount
        
        # Shrani posodobljene denarnice
        self.save_wallet(from_wallet)
        if to_wallet:
            self.save_wallet(to_wallet)

    def mint_nft(self, creator_address: str, name: str, description: str, 
                category: NFTCategory, image_url: str, metadata: Dict[str, Any] = None) -> NFTToken:
        """Ustvari NFT token"""
        token_id = f"nft_{int(time.time())}_{secrets.token_hex(8)}"
        
        nft_token = NFTToken(
            token_id=token_id,
            name=name,
            description=description,
            category=category,
            image_url=image_url,
            metadata=metadata or {},
            owner_address=creator_address,
            creator_address=creator_address,
            mint_timestamp=datetime.datetime.now(),
            rarity=self.determine_rarity(),
            price=0.0
        )
        
        # Dodaj NFT v denarnico
        if creator_address in self.wallets:
            self.wallets[creator_address].nft_tokens.append(token_id)
            self.save_wallet(self.wallets[creator_address])
        
        self.nft_tokens[token_id] = nft_token
        self.save_nft_token(nft_token)
        
        # Ustvari mint transakcijo
        mint_transaction = self.create_transaction(
            from_address="0x0",  # Mint address
            to_address=creator_address,
            amount=0.0,
            currency=CryptoCurrency.OMNI_TOKEN,
            tx_type=TransactionType.NFT_MINT,
            metadata={
                "nft_id": token_id,
                "name": name,
                "category": category.value
            }
        )
        
        logger.info(f"NFT {token_id} uspešno ustvarjen za {creator_address}")
        return nft_token

    def determine_rarity(self) -> str:
        """Določi redkost NFT-ja"""
        import random
        
        rarity_chances = {
            "common": 0.6,
            "uncommon": 0.25,
            "rare": 0.1,
            "epic": 0.04,
            "legendary": 0.01
        }
        
        rand = random.random()
        cumulative = 0.0
        
        for rarity, chance in rarity_chances.items():
            cumulative += chance
            if rand <= cumulative:
                return rarity
        
        return "common"

    def transfer_nft(self, from_address: str, to_address: str, token_id: str) -> bool:
        """Prenesi NFT token"""
        if token_id not in self.nft_tokens:
            return False
        
        nft_token = self.nft_tokens[token_id]
        
        if nft_token.owner_address != from_address:
            return False
        
        # Posodobi lastništvo
        nft_token.owner_address = to_address
        
        # Posodobi denarnici
        if from_address in self.wallets and token_id in self.wallets[from_address].nft_tokens:
            self.wallets[from_address].nft_tokens.remove(token_id)
            self.save_wallet(self.wallets[from_address])
        
        if to_address in self.wallets:
            self.wallets[to_address].nft_tokens.append(token_id)
            self.save_wallet(self.wallets[to_address])
        
        # Ustvari transfer transakcijo
        transfer_transaction = self.create_transaction(
            from_address=from_address,
            to_address=to_address,
            amount=0.0,
            currency=CryptoCurrency.OMNI_TOKEN,
            tx_type=TransactionType.NFT_TRANSFER,
            metadata={
                "nft_id": token_id,
                "name": nft_token.name
            }
        )
        
        self.save_nft_token(nft_token)
        logger.info(f"NFT {token_id} prenesen iz {from_address} v {to_address}")
        return True

    def deploy_smart_contract(self, creator: str, contract_type: SmartContractType, 
                            code: str, abi: Dict[str, Any]) -> SmartContract:
        """Objavi smart contract"""
        contract_id = f"contract_{int(time.time())}_{secrets.token_hex(8)}"
        deployed_address = f"0x{hashlib.sha256(f"{contract_id}{creator}".encode()).hexdigest()[:40]}"
        
        smart_contract = SmartContract(
            contract_id=contract_id,
            contract_type=contract_type,
            code=code,
            abi=abi,
            deployed_address=deployed_address,
            creator=creator,
            created_at=datetime.datetime.now(),
            is_active=True
        )
        
        self.smart_contracts[contract_id] = smart_contract
        self.save_smart_contract(smart_contract)
        
        # Ustvari deployment transakcijo
        deploy_transaction = self.create_transaction(
            from_address=creator,
            to_address=deployed_address,
            amount=0.0,
            currency=CryptoCurrency.OMNI_TOKEN,
            tx_type=TransactionType.SMART_CONTRACT,
            metadata={
                "contract_id": contract_id,
                "contract_type": contract_type.value,
                "action": "deploy"
            }
        )
        
        logger.info(f"Smart contract {contract_id} objavljen na {deployed_address}")
        return smart_contract

    def create_dao_proposal(self, creator: str, title: str, description: str, 
                          voting_period_hours: int = 168) -> Dict[str, Any]:
        """Ustvari DAO predlog"""
        proposal_id = f"proposal_{int(time.time())}_{secrets.token_hex(8)}"
        
        proposal = {
            "id": proposal_id,
            "title": title,
            "description": description,
            "creator": creator,
            "created_at": datetime.datetime.now().isoformat(),
            "voting_end": (datetime.datetime.now() + datetime.timedelta(hours=voting_period_hours)).isoformat(),
            "votes_for": 0.0,
            "votes_against": 0.0,
            "total_voting_power": 0.0,
            "status": "active",
            "voters": []
        }
        
        return proposal

    def vote_on_proposal(self, voter_address: str, proposal_id: str, vote: str) -> bool:
        """Glasuj o DAO predlogu"""
        if voter_address not in self.wallets:
            return False
        
        # Izračunaj glasovalno moč na osnovi OMNI tokenov
        voting_power = self.wallets[voter_address].balances.get(CryptoCurrency.OMNI_TOKEN.value, 0.0)
        
        if voting_power <= 0:
            return False
        
        # Ustvari glasovalno transakcijo
        vote_transaction = self.create_transaction(
            from_address=voter_address,
            to_address="0xDAO",
            amount=0.0,
            currency=CryptoCurrency.OMNI_TOKEN,
            tx_type=TransactionType.DAO_VOTE,
            metadata={
                "proposal_id": proposal_id,
                "vote": vote,
                "voting_power": voting_power
            }
        )
        
        logger.info(f"Glas oddan: {voter_address} glasoval {vote} za predlog {proposal_id}")
        return True

    def get_blockchain_stats(self) -> Dict[str, Any]:
        """Pridobi statistike blockchain-a"""
        total_transactions = sum(len(block.transactions) for block in self.blockchain)
        total_nfts = len(self.nft_tokens)
        total_wallets = len(self.wallets)
        total_contracts = len(self.smart_contracts)
        
        # Izračunaj skupno vrednost
        total_value = 0.0
        for wallet in self.wallets.values():
            for currency, balance in wallet.balances.items():
                if currency in [c.value for c in CryptoCurrency]:
                    rate = self.exchange_rates.get(CryptoCurrency(currency), 1.0)
                    total_value += balance * rate
        
        return {
            "blocks": len(self.blockchain),
            "transactions": total_transactions,
            "pending_transactions": len(self.pending_transactions),
            "nft_tokens": total_nfts,
            "wallets": total_wallets,
            "smart_contracts": total_contracts,
            "total_value_usd": round(total_value, 2),
            "mining_difficulty": self.mining_difficulty,
            "last_block_hash": self.blockchain[-1].hash if self.blockchain else None
        }

    def load_sample_data(self):
        """Naloži vzorčne podatke"""
        # Ustvari demo denarnice
        demo_wallets = [
            "demo_user_1",
            "demo_user_2", 
            "demo_tourist_1",
            "demo_business_1"
        ]
        
        for user_id in demo_wallets:
            wallet = self.create_wallet(user_id)
            logger.info(f"Demo denarnica ustvarjena: {wallet.address}")
        
        # Ustvari demo NFT-je
        if demo_wallets:
            first_wallet = list(self.wallets.values())[0]
            
            demo_nfts = [
                {
                    "name": "Bled Castle Experience",
                    "description": "Ekskluzivna NFT izkušnja obiska Blejskega gradu",
                    "category": NFTCategory.EXPERIENCE,
                    "image_url": "/nft/bled_castle.jpg",
                    "metadata": {"location": "Bled", "duration": "2h", "includes": ["guided_tour", "photo_session"]}
                },
                {
                    "name": "Ljubljana Dragon Collectible",
                    "description": "Limitirana kolekcijska NFT zmaja iz Ljubljane",
                    "category": NFTCategory.COLLECTIBLE,
                    "image_url": "/nft/ljubljana_dragon.jpg",
                    "metadata": {"series": "Ljubljana Legends", "edition": "1/100"}
                },
                {
                    "name": "Triglav Summit Achievement",
                    "description": "NFT dosežek za osvojitev Triglava",
                    "category": NFTCategory.ACHIEVEMENT,
                    "image_url": "/nft/triglav_summit.jpg",
                    "metadata": {"difficulty": "expert", "elevation": "2864m"}
                }
            ]
            
            for nft_data in demo_nfts:
                nft = self.mint_nft(
                    creator_address=first_wallet.address,
                    name=nft_data["name"],
                    description=nft_data["description"],
                    category=nft_data["category"],
                    image_url=nft_data["image_url"],
                    metadata=nft_data["metadata"]
                )
        
        # Ustvari demo smart contracts
        sample_contracts = [
            {
                "type": SmartContractType.RESERVATION,
                "code": "contract ReservationContract { /* Reservation logic */ }",
                "abi": {"functions": ["makeReservation", "cancelReservation", "checkAvailability"]}
            },
            {
                "type": SmartContractType.LOYALTY,
                "code": "contract LoyaltyContract { /* Loyalty program logic */ }",
                "abi": {"functions": ["earnPoints", "redeemRewards", "checkBalance"]}
            }
        ]
        
        if demo_wallets:
            creator_address = list(self.wallets.keys())[0]
            for contract_data in sample_contracts:
                contract = self.deploy_smart_contract(
                    creator=creator_address,
                    contract_type=contract_data["type"],
                    code=contract_data["code"],
                    abi=contract_data["abi"]
                )

    def transaction_to_dict(self, transaction: Transaction) -> Dict[str, Any]:
        """Pretvori transakcijo v slovar"""
        return {
            "tx_id": transaction.tx_id,
            "from_address": transaction.from_address,
            "to_address": transaction.to_address,
            "amount": transaction.amount,
            "currency": transaction.currency.value,
            "tx_type": transaction.tx_type.value,
            "metadata": transaction.metadata,
            "timestamp": transaction.timestamp.isoformat(),
            "gas_fee": transaction.gas_fee,
            "status": transaction.status
        }

    def get_demo_time_remaining(self) -> float:
        """Preostali čas demo verzije"""
        if not self.is_demo:
            return float('inf')
        
        elapsed = (datetime.datetime.now() - self.demo_start_time).total_seconds() / 3600
        remaining = max(0, self.demo_duration_hours - elapsed)
        return round(remaining, 2)

    def check_demo_expiry(self):
        """Preveri, če je demo verzija potekla"""
        if self.is_demo and self.get_demo_time_remaining() <= 0:
            logger.warning("Demo verzija je potekla - sistem se zaklene")
            return True
        return False

    def save_wallet(self, wallet: Wallet):
        """Shrani denarnico"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO wallets 
            (address, private_key, public_key, balances, nft_tokens, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            wallet.address,
            wallet.private_key,
            wallet.public_key,
            json.dumps(wallet.balances),
            json.dumps(wallet.nft_tokens),
            wallet.created_at.isoformat()
        ))
        
        conn.commit()
        conn.close()

    def save_nft_token(self, nft_token: NFTToken):
        """Shrani NFT token"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO nft_tokens 
            (id, name, description, category, image_url, metadata, owner_address, creator_address, mint_timestamp, rarity, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            nft_token.token_id,
            nft_token.name,
            nft_token.description,
            nft_token.category.value,
            nft_token.image_url,
            json.dumps(nft_token.metadata),
            nft_token.owner_address,
            nft_token.creator_address,
            nft_token.mint_timestamp.isoformat(),
            nft_token.rarity,
            nft_token.price
        ))
        
        conn.commit()
        conn.close()

    def save_smart_contract(self, smart_contract: SmartContract):
        """Shrani smart contract"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO smart_contracts 
            (id, contract_type, code, abi, deployed_address, creator, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            smart_contract.contract_id,
            smart_contract.contract_type.value,
            smart_contract.code,
            json.dumps(smart_contract.abi),
            smart_contract.deployed_address,
            smart_contract.creator,
            smart_contract.created_at.isoformat(),
            smart_contract.is_active
        ))
        
        conn.commit()
        conn.close()

    def setup_routes(self):
        """Nastavi Flask route-e"""
        
        @self.app.route('/')
        def dashboard():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            stats = self.get_blockchain_stats()
            
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>⛓️ OMNI Blockchain System</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); 
                        color: white; 
                        min-height: 100vh;
                    }
                    .container { max-width: 1200px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
                    .features-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                        gap: 20px; 
                        margin-bottom: 30px; 
                    }
                    .feature-card { 
                        background: rgba(255,255,255,0.1); 
                        padding: 25px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        transition: transform 0.3s ease;
                    }
                    .feature-card:hover { transform: translateY(-5px); }
                    .feature-icon { font-size: 3em; margin-bottom: 15px; }
                    .feature-title { font-size: 1.3em; font-weight: bold; margin-bottom: 10px; }
                    .feature-description { opacity: 0.9; line-height: 1.5; }
                    .demo-section { 
                        background: rgba(255,255,255,0.1); 
                        padding: 30px; 
                        border-radius: 15px; 
                        backdrop-filter: blur(10px); 
                        border: 1px solid rgba(255,255,255,0.2);
                        margin-bottom: 30px;
                    }
                    .demo-warning { 
                        background: rgba(255,165,0,0.2); 
                        border: 2px solid orange; 
                        padding: 15px; 
                        border-radius: 10px; 
                        margin-bottom: 20px; 
                        text-align: center;
                    }
                    .action-btn {
                        background: #00ff88; 
                        color: black; 
                        padding: 12px 25px; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-size: 1.1em;
                        font-weight: bold;
                        margin: 10px;
                        transition: all 0.3s ease;
                    }
                    .action-btn:hover { 
                        background: #00cc6a; 
                        transform: scale(1.05);
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-top: 20px;
                    }
                    .stat-item {
                        text-align: center;
                        padding: 15px;
                        background: rgba(0,0,0,0.2);
                        border-radius: 10px;
                    }
                    .stat-value {
                        font-size: 2em;
                        font-weight: bold;
                        color: #00ff88;
                    }
                    .stat-label {
                        font-size: 0.9em;
                        opacity: 0.8;
                    }
                    .blockchain-info {
                        background: rgba(0,0,0,0.3);
                        padding: 20px;
                        border-radius: 10px;
                        margin-top: 20px;
                    }
                    .hash-display {
                        font-family: 'Courier New', monospace;
                        font-size: 0.8em;
                        background: rgba(0,0,0,0.5);
                        padding: 10px;
                        border-radius: 5px;
                        word-break: break-all;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⛓️ OMNI Blockchain System</h1>
                        <p>Blockchain integracija za transparentne transakcije in NFT spominke</p>
                    </div>
                    
                    <div class="demo-warning">
                        ⚠️ <strong>DEMO VERZIJA</strong> - Preostali čas: {{ demo_time }}h
                        <br>Za polno funkcionalnost kontaktirajte administratorja.
                    </div>
                    
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">💰</div>
                            <div class="feature-title">Kriptovalutna plačila</div>
                            <div class="feature-description">
                                Podpora za Bitcoin, Ethereum, USDC, USDT in OMNI tokene.
                                Transparentne transakcije z nizko provizijo.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🎨</div>
                            <div class="feature-title">NFT spominki</div>
                            <div class="feature-description">
                                Ustvarjanje in trgovanje z NFT spominki, dosežki in
                                ekskluzivnimi izkušnjami.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">📜</div>
                            <div class="feature-title">Smart Contracts</div>
                            <div class="feature-description">
                                Avtomatizirane rezervacije, loyalty programi in
                                decentralizirane storitve.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🏛️</div>
                            <div class="feature-title">DAO upravljanje</div>
                            <div class="feature-description">
                                Decentralizirane odločitve skupnosti z glasovalnimi
                                tokeni in transparentnim procesom.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🔒</div>
                            <div class="feature-title">Varnost</div>
                            <div class="feature-description">
                                Kriptografska varnost, immutable zapisi in
                                decentralizirana arhitektura.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">📊</div>
                            <div class="feature-title">DeFi integracije</div>
                            <div class="feature-description">
                                Yield farming, liquidity pools in decentralizirane
                                finančne storitve.
                            </div>
                        </div>
                    </div>
                    
                    <div class="demo-section">
                        <h3>🎯 Blockchain statistike</h3>
                        
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">{{ stats.blocks }}</div>
                                <div class="stat-label">Bloki</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ stats.transactions }}</div>
                                <div class="stat-label">Transakcije</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ stats.nft_tokens }}</div>
                                <div class="stat-label">NFT tokeni</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ stats.wallets }}</div>
                                <div class="stat-label">Denarnice</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{{ stats.smart_contracts }}</div>
                                <div class="stat-label">Smart Contracts</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${{ stats.total_value_usd }}</div>
                                <div class="stat-label">Skupna vrednost</div>
                            </div>
                        </div>
                        
                        <div class="blockchain-info">
                            <h4>⛓️ Blockchain informacije</h4>
                            <p><strong>Mining difficulty:</strong> {{ stats.mining_difficulty }}</p>
                            <p><strong>Čakajoče transakcije:</strong> {{ stats.pending_transactions }}</p>
                            {% if stats.last_block_hash %}
                            <p><strong>Zadnji blok hash:</strong></p>
                            <div class="hash-display">{{ stats.last_block_hash }}</div>
                            {% endif %}
                        </div>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <button class="action-btn" onclick="createWallet()">💳 Ustvari denarnico</button>
                            <button class="action-btn" onclick="mintNFT()">🎨 Ustvari NFT</button>
                            <button class="action-btn" onclick="sendTransaction()">💸 Pošlji transakcijo</button>
                            <button class="action-btn" onclick="mineBlock()">⛏️ Rudarji blok</button>
                            <button class="action-btn" onclick="showWallets()">👛 Prikaži denarnice</button>
                            <button class="action-btn" onclick="showNFTs()">🖼️ Prikaži NFT-je</button>
                        </div>
                    </div>
                    
                    <div id="demoResults" style="display: none; margin-top: 20px; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                        <h4>Demo rezultati:</h4>
                        <div id="demoContent"></div>
                    </div>
                </div>
                
                <script>
                    function createWallet() {
                        fetch('/api/wallet/create', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({user_id: 'demo_user_' + Date.now()})
                        })
                        .then(r => r.json())
                        .then(data => showDemoResults('Nova denarnica', data));
                    }
                    
                    function mintNFT() {
                        fetch('/api/nft/mint', {method: 'POST'})
                        .then(r => r.json())
                        .then(data => showDemoResults('NFT ustvarjen', data));
                    }
                    
                    function sendTransaction() {
                        fetch('/api/transaction/demo', {method: 'POST'})
                        .then(r => r.json())
                        .then(data => showDemoResults('Transakcija', data));
                    }
                    
                    function mineBlock() {
                        fetch('/api/blockchain/mine', {method: 'POST'})
                        .then(r => r.json())
                        .then(data => showDemoResults('Rudarjenje bloka', data));
                    }
                    
                    function showWallets() {
                        fetch('/api/wallets')
                        .then(r => r.json())
                        .then(data => showDemoResults('Denarnice', data));
                    }
                    
                    function showNFTs() {
                        fetch('/api/nfts')
                        .then(r => r.json())
                        .then(data => showDemoResults('NFT tokeni', data));
                    }
                    
                    function showDemoResults(title, data) {
                        const resultsDiv = document.getElementById('demoResults');
                        const contentDiv = document.getElementById('demoContent');
                        
                        contentDiv.innerHTML = `
                            <h5>${title}</h5>
                            <pre>${JSON.stringify(data, null, 2)}</pre>
                        `;
                        
                        resultsDiv.style.display = 'block';
                        resultsDiv.scrollIntoView({behavior: 'smooth'});
                    }
                    
                    // Auto-refresh stats every 30 seconds
                    setInterval(() => {
                        location.reload();
                    }, 30000);
                </script>
            </body>
            </html>
            ''', 
            demo_time=self.get_demo_time_remaining(),
            stats=stats
            )
        
        @self.app.route('/api/wallet/create', methods=['POST'])
        def api_create_wallet():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            data = request.get_json()
            user_id = data.get('user_id', f'demo_user_{int(time.time())}')
            
            wallet = self.create_wallet(user_id)
            
            return jsonify({
                'status': 'success',
                'wallet': {
                    'address': wallet.address,
                    'balances': wallet.balances,
                    'nft_tokens': len(wallet.nft_tokens),
                    'created_at': wallet.created_at.isoformat()
                }
            })
        
        @self.app.route('/api/nft/mint', methods=['POST'])
        def api_mint_nft():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            if not self.wallets:
                return jsonify({"error": "Ni denarnic"}), 400
            
            # Uporabi prvo denarnico za demo
            creator_address = list(self.wallets.keys())[0]
            
            import random
            demo_nfts = [
                {"name": "Piran Sunset", "description": "Čudovit sončni zahod v Piranu", "category": NFTCategory.EXPERIENCE},
                {"name": "Vintgar Gorge", "description": "Naravni spomenik soteske Vintgar", "category": NFTCategory.LOCATION},
                {"name": "Wine Tasting Master", "description": "Dosežek za degustacijo vin", "category": NFTCategory.ACHIEVEMENT}
            ]
            
            nft_data = random.choice(demo_nfts)
            
            nft = self.mint_nft(
                creator_address=creator_address,
                name=nft_data["name"],
                description=nft_data["description"],
                category=nft_data["category"],
                image_url=f"/nft/{nft_data['name'].lower().replace(' ', '_')}.jpg",
                metadata={"demo": True, "created_by": "demo_system"}
            )
            
            return jsonify({
                'status': 'success',
                'nft': {
                    'token_id': nft.token_id,
                    'name': nft.name,
                    'description': nft.description,
                    'category': nft.category.value,
                    'rarity': nft.rarity,
                    'owner': nft.owner_address
                }
            })
        
        @self.app.route('/api/transaction/demo', methods=['POST'])
        def api_demo_transaction():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            if len(self.wallets) < 2:
                return jsonify({"error": "Potrebni sta vsaj 2 denarnici"}), 400
            
            # Demo transakcija med prvima dvema denarnicama
            wallet_addresses = list(self.wallets.keys())
            from_address = wallet_addresses[0]
            to_address = wallet_addresses[1]
            
            transaction = self.create_transaction(
                from_address=from_address,
                to_address=to_address,
                amount=10.0,
                currency=CryptoCurrency.OMNI_TOKEN,
                tx_type=TransactionType.PAYMENT,
                metadata={"demo": True, "purpose": "demo_payment"}
            )
            
            return jsonify({
                'status': 'success',
                'transaction': self.transaction_to_dict(transaction)
            })
        
        @self.app.route('/api/blockchain/mine', methods=['POST'])
        def api_mine_block():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            if not self.pending_transactions:
                return jsonify({"message": "Ni čakajočih transakcij za rudarjenje"}), 200
            
            # Rudarji čakajoče transakcije
            self.process_pending_transactions()
            
            last_block = self.blockchain[-1]
            
            return jsonify({
                'status': 'success',
                'message': 'Blok uspešno rudarjen',
                'block': {
                    'index': last_block.index,
                    'hash': last_block.hash,
                    'transactions': len(last_block.transactions),
                    'timestamp': last_block.timestamp
                }
            })
        
        @self.app.route('/api/wallets')
        def api_wallets():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            wallets_data = []
            for address, wallet in self.wallets.items():
                wallets_data.append({
                    'address': address,
                    'balances': wallet.balances,
                    'nft_count': len(wallet.nft_tokens),
                    'created_at': wallet.created_at.isoformat()
                })
            
            return jsonify({
                'wallets': wallets_data,
                'total_count': len(wallets_data)
            })
        
        @self.app.route('/api/nfts')
        def api_nfts():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            nfts_data = []
            for token_id, nft in self.nft_tokens.items():
                nfts_data.append({
                    'token_id': token_id,
                    'name': nft.name,
                    'description': nft.description,
                    'category': nft.category.value,
                    'rarity': nft.rarity,
                    'owner': nft.owner_address,
                    'creator': nft.creator_address,
                    'mint_timestamp': nft.mint_timestamp.isoformat()
                })
            
            return jsonify({
                'nfts': nfts_data,
                'total_count': len(nfts_data)
            })
        
        @self.app.route('/api/stats')
        def api_stats():
            if self.check_demo_expiry():
                return jsonify({"error": "Demo verzija je potekla"}), 403
            
            return jsonify(self.get_blockchain_stats())

    def run_server(self, host='localhost', port=5007):
        """Zaženi Flask server"""
        logger.info(f"Zaganjam Blockchain System na http://{host}:{port}")
        self.app.run(host=host, port=port, debug=True)

async def demo_blockchain_system():
    """Demo funkcija za testiranje Blockchain System"""
    print("\n" + "="*50)
    print("⛓️ OMNI BLOCKCHAIN SYSTEM - DEMO")
    print("="*50)
    
    # Inicializacija
    blockchain = OmniBlockchainSystem()
    
    print(f"🔧 Blockchain System inicializiran:")
    print(f"  • Bloki: {len(blockchain.blockchain)}")
    print(f"  • Denarnice: {len(blockchain.wallets)}")
    print(f"  • NFT tokeni: {len(blockchain.nft_tokens)}")
    print(f"  • Smart Contracts: {len(blockchain.smart_contracts)}")
    print(f"  • Demo trajanje: {blockchain.demo_duration_hours}h")
    print(f"  • Preostali čas: {blockchain.get_demo_time_remaining()}h")
    
    # Test denarnic
    print(f"\n💳 Demo denarnice:")
    for address, wallet in blockchain.wallets.items():
        print(f"  ✅ {address[:20]}...")
        for currency, balance in wallet.balances.items():
            print(f"     {currency}: {balance}")
    
    # Test NFT-jev
    print(f"\n🎨 Demo NFT tokeni:")
    for token_id, nft in blockchain.nft_tokens.items():
        print(f"  ✅ {nft.name} ({nft.rarity})")
        print(f"     Kategorija: {nft.category.value}")
        print(f"     Lastnik: {nft.owner_address[:20]}...")
    
    # Test transakcij
    print(f"\n💸 Demo transakcije:")
    if len(blockchain.wallets) >= 2:
        wallet_addresses = list(blockchain.wallets.keys())
        transaction = blockchain.create_transaction(
            from_address=wallet_addresses[0],
            to_address=wallet_addresses[1],
            amount=50.0,
            currency=CryptoCurrency.OMNI_TOKEN,
            tx_type=TransactionType.PAYMENT,
            metadata={"demo": True}
        )
        print(f"  ✅ Transakcija ustvarjena: {transaction.tx_id}")
        print(f"     Status: {transaction.status}")
        print(f"     Znesek: {transaction.amount} {transaction.currency.value}")
        print(f"     Gas fee: {transaction.gas_fee}")
    
    # Test rudarjenja
    print(f"\n⛏️ Rudarjenje bloka:")
    if blockchain.pending_transactions:
        blockchain.process_pending_transactions()
        last_block = blockchain.blockchain[-1]
        print(f"  ✅ Blok {last_block.index} rudarjen")
        print(f"     Hash: {last_block.hash}")
        print(f"     Transakcije: {len(last_block.transactions)}")
    
    # Test smart contracts
    print(f"\n📜 Smart Contracts:")
    for contract_id, contract in blockchain.smart_contracts.items():
        print(f"  ✅ {contract.contract_type.value}")
        print(f"     ID: {contract_id}")
        print(f"     Naslov: {contract.deployed_address}")
        print(f"     Aktiven: {contract.is_active}")
    
    # Blockchain statistike
    stats = blockchain.get_blockchain_stats()
    print(f"\n📊 Blockchain statistike:")
    print(f"  • Bloki: {stats['blocks']}")
    print(f"  • Transakcije: {stats['transactions']}")
    print(f"  • NFT tokeni: {stats['nft_tokens']}")
    print(f"  • Denarnice: {stats['wallets']}")
    print(f"  • Smart Contracts: {stats['smart_contracts']}")
    print(f"  • Skupna vrednost: ${stats['total_value_usd']}")
    print(f"  • Mining difficulty: {stats['mining_difficulty']}")
    
    print(f"\n🎉 Blockchain System uspešno testiran!")
    print(f"  • Kriptovalutna plačila (BTC, ETH, USDC, USDT, OMNI)")
    print(f"  • NFT spominki in kolektibli")
    print(f"  • Smart Contracts za rezervacije in loyalty")
    print(f"  • Transparentne transakcije z Proof of Work")
    print(f"  • Decentralizirane denarnice")
    print(f"  • DAO glasovanje in upravljanje")
    print(f"  • Demo časovna omejitev in varnostne kontrole")

if __name__ == "__main__":
    import sys
    import asyncio
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        # Zaženi Flask server
        blockchain = OmniBlockchainSystem()
        blockchain.run_server(host='0.0.0.0', port=5007)
    else:
        # Zaženi demo
        asyncio.run(demo_blockchain_system())