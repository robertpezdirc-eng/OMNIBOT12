"""
😊 Guest Satisfaction Engine - Sistem za analizo zadovoljstva gostov
AI-powered analiza komentarjev, ocen, sentiment analiza in priporočila
"""

import sqlite3
import json
import logging
import re
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import nltk
from textblob import TextBlob
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

logger = logging.getLogger(__name__)

class ReviewSource(Enum):
    BOOKING = "booking"
    TRIPADVISOR = "tripadvisor"
    GOOGLE = "google"
    DIRECT = "direct"
    AIRBNB = "airbnb"
    INTERNAL = "internal"

class SentimentType(Enum):
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"

class IssueCategory(Enum):
    SERVICE = "service"
    CLEANLINESS = "cleanliness"
    LOCATION = "location"
    VALUE = "value"
    AMENITIES = "amenities"
    FOOD = "food"
    NOISE = "noise"
    WIFI = "wifi"
    PARKING = "parking"
    STAFF = "staff"

class ResponseStatus(Enum):
    PENDING = "pending"
    RESPONDED = "responded"
    ESCALATED = "escalated"
    RESOLVED = "resolved"

@dataclass
class GuestReview:
    """Ocena gosta"""
    review_id: str
    guest_name: str
    guest_email: str
    room_number: str
    check_in_date: date
    check_out_date: date
    overall_rating: int
    service_rating: int
    cleanliness_rating: int
    location_rating: int
    value_rating: int
    amenities_rating: int
    review_text: str
    source: ReviewSource
    review_date: datetime
    sentiment_score: float = None
    sentiment_type: SentimentType = None
    identified_issues: List[IssueCategory] = None
    response_status: ResponseStatus = ResponseStatus.PENDING
    staff_response: str = None
    response_date: datetime = None

@dataclass
class SentimentAnalysis:
    """Rezultat sentiment analize"""
    review_id: str
    sentiment_score: float
    sentiment_type: SentimentType
    confidence: float
    positive_keywords: List[str]
    negative_keywords: List[str]
    identified_issues: List[IssueCategory]
    emotion_scores: Dict[str, float]

@dataclass
class SatisfactionReport:
    """Poročilo o zadovoljstvu"""
    report_id: str
    period_start: date
    period_end: date
    total_reviews: int
    average_rating: float
    sentiment_distribution: Dict[SentimentType, int]
    category_ratings: Dict[str, float]
    top_issues: List[Tuple[IssueCategory, int]]
    improvement_suggestions: List[str]
    response_rate: float
    nps_score: float
    created_at: datetime

@dataclass
class AutoResponse:
    """Avtomatski odgovor"""
    response_id: str
    review_id: str
    response_text: str
    response_type: str
    confidence: float
    requires_human_review: bool
    created_at: datetime

class GuestSatisfactionEngine:
    """Glavni sistem za analizo zadovoljstva gostov"""
    
    def __init__(self, db_path: str = "guest_satisfaction.db"):
        self.db_path = db_path
        self._init_database()
        self._init_sentiment_keywords()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela ocen
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS guest_reviews (
                    review_id TEXT PRIMARY KEY,
                    guest_name TEXT NOT NULL,
                    guest_email TEXT,
                    room_number TEXT,
                    check_in_date TEXT,
                    check_out_date TEXT,
                    overall_rating INTEGER NOT NULL,
                    service_rating INTEGER,
                    cleanliness_rating INTEGER,
                    location_rating INTEGER,
                    value_rating INTEGER,
                    amenities_rating INTEGER,
                    review_text TEXT,
                    source TEXT NOT NULL,
                    review_date TEXT NOT NULL,
                    sentiment_score REAL,
                    sentiment_type TEXT,
                    identified_issues TEXT,
                    response_status TEXT DEFAULT 'pending',
                    staff_response TEXT,
                    response_date TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela sentiment analiz
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sentiment_analyses (
                    analysis_id TEXT PRIMARY KEY,
                    review_id TEXT NOT NULL,
                    sentiment_score REAL NOT NULL,
                    sentiment_type TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    positive_keywords TEXT,
                    negative_keywords TEXT,
                    identified_issues TEXT,
                    emotion_scores TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (review_id) REFERENCES guest_reviews (review_id)
                )
            ''')
            
            # Tabela poročil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS satisfaction_reports (
                    report_id TEXT PRIMARY KEY,
                    period_start TEXT NOT NULL,
                    period_end TEXT NOT NULL,
                    total_reviews INTEGER NOT NULL,
                    average_rating REAL NOT NULL,
                    sentiment_distribution TEXT,
                    category_ratings TEXT,
                    top_issues TEXT,
                    improvement_suggestions TEXT,
                    response_rate REAL,
                    nps_score REAL,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela avtomatskih odgovorov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS auto_responses (
                    response_id TEXT PRIMARY KEY,
                    review_id TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    response_type TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    requires_human_review BOOLEAN NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (review_id) REFERENCES guest_reviews (review_id)
                )
            ''')
            
            # Tabela predlog izboljšav
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS improvement_suggestions (
                    suggestion_id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    suggestion_text TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    estimated_impact REAL,
                    implementation_cost TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela NPS podatkov
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS nps_data (
                    nps_id TEXT PRIMARY KEY,
                    guest_email TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    feedback TEXT,
                    survey_date TEXT NOT NULL,
                    follow_up_sent BOOLEAN DEFAULT FALSE,
                    created_at TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            logger.info("😊 Guest Satisfaction baza podatkov inicializirana")
    
    def _init_sentiment_keywords(self):
        """Inicializacija ključnih besed za sentiment analizo"""
        self.positive_keywords = {
            'slovenian': [
                'odličen', 'fantastičen', 'čudovit', 'super', 'izvrstno',
                'priporočam', 'perfektno', 'neverjetno', 'vrhunsko', 'sijajno',
                'prijazno', 'čisto', 'udobno', 'mirno', 'lepo', 'dobro',
                'zadovoljen', 'navdušen', 'presenetljivo', 'kakovostno'
            ],
            'english': [
                'excellent', 'fantastic', 'wonderful', 'amazing', 'perfect',
                'outstanding', 'superb', 'brilliant', 'great', 'awesome',
                'friendly', 'clean', 'comfortable', 'quiet', 'beautiful',
                'satisfied', 'impressed', 'recommend', 'quality', 'professional'
            ]
        }
        
        self.negative_keywords = {
            'slovenian': [
                'slab', 'grozno', 'nezadovoljen', 'razočaran', 'slabo',
                'umazan', 'hladen', 'drag', 'neprijazen', 'glasno',
                'ne priporočam', 'katastrofa', 'neznosno', 'neprofesionalno',
                'počasen', 'zanemarjen', 'neudoben', 'smrdeč', 'pokvarjen'
            ],
            'english': [
                'bad', 'terrible', 'awful', 'horrible', 'disappointing',
                'dirty', 'cold', 'expensive', 'unfriendly', 'noisy',
                'not recommend', 'disaster', 'unbearable', 'unprofessional',
                'slow', 'neglected', 'uncomfortable', 'smelly', 'broken'
            ]
        }
        
        self.issue_keywords = {
            IssueCategory.SERVICE: ['storitev', 'osebje', 'service', 'staff', 'reception'],
            IssueCategory.CLEANLINESS: ['čistoča', 'umazan', 'clean', 'dirty', 'hygiene'],
            IssueCategory.LOCATION: ['lokacija', 'location', 'position', 'access'],
            IssueCategory.VALUE: ['cena', 'vrednost', 'price', 'value', 'expensive'],
            IssueCategory.AMENITIES: ['oprema', 'amenities', 'facilities', 'equipment'],
            IssueCategory.FOOD: ['hrana', 'food', 'breakfast', 'restaurant', 'meal'],
            IssueCategory.NOISE: ['hrup', 'glasno', 'noise', 'loud', 'quiet'],
            IssueCategory.WIFI: ['wifi', 'internet', 'connection', 'signal'],
            IssueCategory.PARKING: ['parkiranje', 'parking', 'garage', 'car'],
            IssueCategory.STAFF: ['osebje', 'staff', 'employee', 'worker', 'manager']
        }
    
    def add_guest_review(self, review: GuestReview) -> Dict[str, Any]:
        """Dodaj oceno gosta"""
        try:
            # Izvedi sentiment analizo
            sentiment_analysis = self._analyze_sentiment(review.review_text, review.review_id)
            
            # Posodobi review z rezultati analize
            review.sentiment_score = sentiment_analysis.sentiment_score
            review.sentiment_type = sentiment_analysis.sentiment_type
            review.identified_issues = sentiment_analysis.identified_issues
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO guest_reviews 
                    (review_id, guest_name, guest_email, room_number, check_in_date,
                     check_out_date, overall_rating, service_rating, cleanliness_rating,
                     location_rating, value_rating, amenities_rating, review_text,
                     source, review_date, sentiment_score, sentiment_type,
                     identified_issues, response_status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    review.review_id,
                    review.guest_name,
                    review.guest_email,
                    review.room_number,
                    review.check_in_date.isoformat() if review.check_in_date else None,
                    review.check_out_date.isoformat() if review.check_out_date else None,
                    review.overall_rating,
                    review.service_rating,
                    review.cleanliness_rating,
                    review.location_rating,
                    review.value_rating,
                    review.amenities_rating,
                    review.review_text,
                    review.source.value,
                    review.review_date.isoformat(),
                    review.sentiment_score,
                    review.sentiment_type.value if review.sentiment_type else None,
                    json.dumps([issue.value for issue in review.identified_issues]) if review.identified_issues else None,
                    review.response_status.value,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                # Generiraj avtomatski odgovor če je potreben
                auto_response = None
                if review.overall_rating <= 3 or review.sentiment_type in [SentimentType.NEGATIVE, SentimentType.VERY_NEGATIVE]:
                    auto_response = self._generate_auto_response(review)
                
                return {
                    "success": True,
                    "review_id": review.review_id,
                    "sentiment_analysis": {
                        "sentiment_score": sentiment_analysis.sentiment_score,
                        "sentiment_type": sentiment_analysis.sentiment_type.value,
                        "confidence": sentiment_analysis.confidence,
                        "identified_issues": [issue.value for issue in sentiment_analysis.identified_issues]
                    },
                    "auto_response": auto_response,
                    "message": "Ocena gosta uspešno dodana in analizirana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju ocene gosta: {e}")
            return {"success": False, "error": str(e)}
    
    def _analyze_sentiment(self, text: str, review_id: str) -> SentimentAnalysis:
        """Izvedi sentiment analizo besedila"""
        try:
            if not text:
                return SentimentAnalysis(
                    review_id=review_id,
                    sentiment_score=0.0,
                    sentiment_type=SentimentType.NEUTRAL,
                    confidence=0.0,
                    positive_keywords=[],
                    negative_keywords=[],
                    identified_issues=[],
                    emotion_scores={}
                )
            
            # Osnovni sentiment z TextBlob
            blob = TextBlob(text.lower())
            polarity = blob.sentiment.polarity  # -1 do 1
            
            # Preštej pozitivne in negativne ključne besede
            positive_found = []
            negative_found = []
            
            for lang in ['slovenian', 'english']:
                for keyword in self.positive_keywords[lang]:
                    if keyword.lower() in text.lower():
                        positive_found.append(keyword)
                
                for keyword in self.negative_keywords[lang]:
                    if keyword.lower() in text.lower():
                        negative_found.append(keyword)
            
            # Prilagodi sentiment score glede na ključne besede
            keyword_adjustment = (len(positive_found) - len(negative_found)) * 0.1
            adjusted_score = polarity + keyword_adjustment
            adjusted_score = max(-1.0, min(1.0, adjusted_score))  # Omeji na [-1, 1]
            
            # Določi sentiment tip
            if adjusted_score >= 0.6:
                sentiment_type = SentimentType.VERY_POSITIVE
            elif adjusted_score >= 0.2:
                sentiment_type = SentimentType.POSITIVE
            elif adjusted_score >= -0.2:
                sentiment_type = SentimentType.NEUTRAL
            elif adjusted_score >= -0.6:
                sentiment_type = SentimentType.NEGATIVE
            else:
                sentiment_type = SentimentType.VERY_NEGATIVE
            
            # Identifikacija problemov
            identified_issues = []
            for issue_category, keywords in self.issue_keywords.items():
                for keyword in keywords:
                    if keyword.lower() in text.lower():
                        # Preveri če je v negativnem kontekstu
                        context_negative = any(neg_word in text.lower() 
                                             for neg_word in self.negative_keywords['slovenian'] + self.negative_keywords['english'])
                        if context_negative or adjusted_score < 0:
                            identified_issues.append(issue_category)
                        break
            
            # Odstrani duplikate
            identified_issues = list(set(identified_issues))
            
            # Izračunaj zaupanje
            confidence = min(1.0, abs(adjusted_score) + (len(positive_found) + len(negative_found)) * 0.05)
            
            # Simuliraj emotion scores
            emotion_scores = {
                'joy': max(0, adjusted_score) if adjusted_score > 0 else 0,
                'anger': max(0, -adjusted_score) if adjusted_score < -0.5 else 0,
                'sadness': max(0, -adjusted_score * 0.7) if adjusted_score < -0.3 else 0,
                'surprise': 0.1 if abs(adjusted_score) > 0.8 else 0,
                'fear': 0.1 if adjusted_score < -0.7 else 0,
                'disgust': max(0, -adjusted_score * 0.5) if adjusted_score < -0.6 else 0
            }
            
            analysis = SentimentAnalysis(
                review_id=review_id,
                sentiment_score=adjusted_score,
                sentiment_type=sentiment_type,
                confidence=confidence,
                positive_keywords=positive_found,
                negative_keywords=negative_found,
                identified_issues=identified_issues,
                emotion_scores=emotion_scores
            )
            
            # Shrani analizo
            self._save_sentiment_analysis(analysis)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Napaka pri sentiment analizi: {e}")
            return SentimentAnalysis(
                review_id=review_id,
                sentiment_score=0.0,
                sentiment_type=SentimentType.NEUTRAL,
                confidence=0.0,
                positive_keywords=[],
                negative_keywords=[],
                identified_issues=[],
                emotion_scores={}
            )
    
    def _save_sentiment_analysis(self, analysis: SentimentAnalysis):
        """Shrani sentiment analizo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO sentiment_analyses 
                    (analysis_id, review_id, sentiment_score, sentiment_type,
                     confidence, positive_keywords, negative_keywords,
                     identified_issues, emotion_scores, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    f"SENT_{analysis.review_id}",
                    analysis.review_id,
                    analysis.sentiment_score,
                    analysis.sentiment_type.value,
                    analysis.confidence,
                    json.dumps(analysis.positive_keywords),
                    json.dumps(analysis.negative_keywords),
                    json.dumps([issue.value for issue in analysis.identified_issues]),
                    json.dumps(analysis.emotion_scores),
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju sentiment analize: {e}")
    
    def _generate_auto_response(self, review: GuestReview) -> Dict[str, Any]:
        """Generiraj avtomatski odgovor na oceno"""
        try:
            response_templates = {
                SentimentType.VERY_NEGATIVE: [
                    "Spoštovani {guest_name}, iskreno se opravičujemo za negativno izkušnjo. Vaše pripombe jemljemo zelo resno in bomo takoj ukrepali. Prosimo, kontaktirajte nas na management@hotel.si za osebno rešitev.",
                    "Dragi {guest_name}, globoko obžalujemo, da nismo izpolnili vaših pričakovanj. Vaš feedback je za nas izjemno pomemben. Naš manager vas bo kontaktiral v 24 urah."
                ],
                SentimentType.NEGATIVE: [
                    "Spoštovani {guest_name}, hvala za vaš feedback. Opravičujemo se za nevšečnosti in bomo vaše pripombe uporabili za izboljšanje naših storitev.",
                    "Dragi {guest_name}, cenimo vaš iskren feedback. Vaše pripombe bomo posredovali pristojnim oddelkom za takojšnje izboljšave."
                ],
                SentimentType.NEUTRAL: [
                    "Spoštovani {guest_name}, hvala za vašo oceno. Veseli bi bili, če bi delili več podrobnosti o vaši izkušnji, da lahko izboljšamo naše storitve.",
                    "Dragi {guest_name}, cenimo vaš čas za oceno. Vaš feedback nam pomaga pri nenehnem izboljševanju."
                ]
            }
            
            # Izberi primeren template
            templates = response_templates.get(review.sentiment_type, response_templates[SentimentType.NEUTRAL])
            response_text = np.random.choice(templates).format(guest_name=review.guest_name)
            
            # Dodaj specifične odgovore glede na identificirane probleme
            if review.identified_issues:
                issue_responses = {
                    IssueCategory.SERVICE: "Vaše pripombe o storitvi bomo posredovali našemu osebju za dodatno usposabljanje.",
                    IssueCategory.CLEANLINESS: "Standarde čistoče jemljemo zelo resno in bomo takoj preverili naše postopke.",
                    IssueCategory.NOISE: "Opravičujemo se za motnje s hrupom. Implementirali bomo dodatne ukrepe za zagotovitev miru.",
                    IssueCategory.WIFI: "Tehnične težave z internetom rešujemo prednostno. Hvala za potrpežljivost.",
                    IssueCategory.FOOD: "Vaš feedback o hrani bomo posredovali kuharskemu osebju za izboljšanje.",
                    IssueCategory.VALUE: "Cenimo vaše mnenje o razmerju cena-vrednost in bomo preučili naše ponudbe."
                }
                
                for issue in review.identified_issues:
                    if issue in issue_responses:
                        response_text += f" {issue_responses[issue]}"
            
            # Dodaj zaključek
            response_text += " Upamo, da nam boste dali priložnost, da vas ponovno gostimo in pokažemo naše izboljšave."
            
            # Določi ali potrebuje človeški pregled
            requires_human_review = (
                review.overall_rating <= 2 or 
                review.sentiment_type == SentimentType.VERY_NEGATIVE or
                len(review.identified_issues) > 2
            )
            
            # Izračunaj zaupanje
            confidence = 0.9 if not requires_human_review else 0.6
            
            auto_response = AutoResponse(
                response_id=f"AUTO_{review.review_id}",
                review_id=review.review_id,
                response_text=response_text,
                response_type="automated_apology" if review.sentiment_type in [SentimentType.NEGATIVE, SentimentType.VERY_NEGATIVE] else "automated_thanks",
                confidence=confidence,
                requires_human_review=requires_human_review,
                created_at=datetime.now()
            )
            
            # Shrani avtomatski odgovor
            self._save_auto_response(auto_response)
            
            return {
                "response_id": auto_response.response_id,
                "response_text": response_text,
                "requires_human_review": requires_human_review,
                "confidence": confidence
            }
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju avtomatskega odgovora: {e}")
            return None
    
    def _save_auto_response(self, response: AutoResponse):
        """Shrani avtomatski odgovor"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO auto_responses 
                    (response_id, review_id, response_text, response_type,
                     confidence, requires_human_review, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    response.response_id,
                    response.review_id,
                    response.response_text,
                    response.response_type,
                    response.confidence,
                    response.requires_human_review,
                    response.created_at.isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju avtomatskega odgovora: {e}")
    
    def generate_satisfaction_report(self, start_date: date, 
                                   end_date: date) -> Dict[str, Any]:
        """Generiraj poročilo o zadovoljstvu"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Pridobi ocene za obdobje
                df = pd.read_sql_query('''
                    SELECT * FROM guest_reviews 
                    WHERE review_date BETWEEN ? AND ?
                ''', conn, params=[start_date.isoformat(), end_date.isoformat()])
            
            if df.empty:
                return {"success": False, "error": "Ni ocen za izbrano obdobje"}
            
            # Osnovne statistike
            total_reviews = len(df)
            average_rating = df['overall_rating'].mean()
            
            # Distribucija sentimenta
            sentiment_counts = df['sentiment_type'].value_counts().to_dict()
            sentiment_distribution = {
                SentimentType.VERY_POSITIVE: sentiment_counts.get('very_positive', 0),
                SentimentType.POSITIVE: sentiment_counts.get('positive', 0),
                SentimentType.NEUTRAL: sentiment_counts.get('neutral', 0),
                SentimentType.NEGATIVE: sentiment_counts.get('negative', 0),
                SentimentType.VERY_NEGATIVE: sentiment_counts.get('very_negative', 0)
            }
            
            # Ocene po kategorijah
            category_ratings = {
                'service': df['service_rating'].mean(),
                'cleanliness': df['cleanliness_rating'].mean(),
                'location': df['location_rating'].mean(),
                'value': df['value_rating'].mean(),
                'amenities': df['amenities_rating'].mean()
            }
            
            # Najpogostejši problemi
            all_issues = []
            for issues_json in df['identified_issues'].dropna():
                try:
                    issues = json.loads(issues_json)
                    all_issues.extend(issues)
                except:
                    continue
            
            issue_counts = Counter(all_issues)
            top_issues = [(IssueCategory(issue), count) for issue, count in issue_counts.most_common(5)]
            
            # Stopnja odzivnosti
            responded_reviews = len(df[df['response_status'] != 'pending'])
            response_rate = responded_reviews / total_reviews if total_reviews > 0 else 0
            
            # NPS izračun (simuliran)
            promoters = len(df[df['overall_rating'] >= 4])
            detractors = len(df[df['overall_rating'] <= 2])
            nps_score = ((promoters - detractors) / total_reviews * 100) if total_reviews > 0 else 0
            
            # Predlogi izboljšav
            improvement_suggestions = self._generate_improvement_suggestions(
                category_ratings, top_issues, sentiment_distribution
            )
            
            # Ustvari poročilo
            report = SatisfactionReport(
                report_id=f"SAT_REPORT_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}",
                period_start=start_date,
                period_end=end_date,
                total_reviews=total_reviews,
                average_rating=average_rating,
                sentiment_distribution=sentiment_distribution,
                category_ratings=category_ratings,
                top_issues=top_issues,
                improvement_suggestions=improvement_suggestions,
                response_rate=response_rate,
                nps_score=nps_score,
                created_at=datetime.now()
            )
            
            # Shrani poročilo
            self._save_satisfaction_report(report)
            
            return {
                "success": True,
                "report_id": report.report_id,
                "period": f"{start_date} - {end_date}",
                "summary": {
                    "total_reviews": total_reviews,
                    "average_rating": round(average_rating, 2),
                    "nps_score": round(nps_score, 1),
                    "response_rate": round(response_rate * 100, 1)
                },
                "sentiment_distribution": {
                    k.value: v for k, v in sentiment_distribution.items()
                },
                "category_ratings": {
                    k: round(v, 2) for k, v in category_ratings.items()
                },
                "top_issues": [
                    {"issue": issue.value, "count": count} 
                    for issue, count in top_issues
                ],
                "improvement_suggestions": improvement_suggestions,
                "insights": self._generate_insights(report),
                "recommendations": self._generate_recommendations(report)
            }
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju poročila: {e}")
            return {"success": False, "error": str(e)}
    
    def _generate_improvement_suggestions(self, category_ratings: Dict[str, float],
                                        top_issues: List[Tuple[IssueCategory, int]],
                                        sentiment_distribution: Dict[SentimentType, int]) -> List[str]:
        """Generiraj predloge izboljšav"""
        suggestions = []
        
        # Analiziraj ocene po kategorijah
        for category, rating in category_ratings.items():
            if rating < 3.5:
                if category == 'service':
                    suggestions.append("Dodatno usposabljanje osebja za boljše storitve")
                elif category == 'cleanliness':
                    suggestions.append("Povečanje standardov čistoče in vzdrževanja")
                elif category == 'value':
                    suggestions.append("Pregled razmerja cena-vrednost in prilagoditev ponudbe")
                elif category == 'amenities':
                    suggestions.append("Nadgradnja opreme in dodatnih storitev")
                elif category == 'location':
                    suggestions.append("Izboljšanje dostopnosti in informacij o lokaciji")
        
        # Analiziraj najpogostejše probleme
        for issue, count in top_issues[:3]:
            if issue == IssueCategory.NOISE:
                suggestions.append("Implementacija ukrepov za zmanjšanje hrupa")
            elif issue == IssueCategory.WIFI:
                suggestions.append("Nadgradnja internetne infrastrukture")
            elif issue == IssueCategory.PARKING:
                suggestions.append("Razširitev parkirnih možnosti ali alternativne rešitve")
            elif issue == IssueCategory.FOOD:
                suggestions.append("Izboljšanje kakovosti hrane in raznovrstnosti menija")
        
        # Analiziraj sentiment
        negative_ratio = (sentiment_distribution[SentimentType.NEGATIVE] + 
                         sentiment_distribution[SentimentType.VERY_NEGATIVE]) / sum(sentiment_distribution.values())
        
        if negative_ratio > 0.2:
            suggestions.append("Implementacija sistema za hitro reševanje pritožb")
            suggestions.append("Redni treningi za izboljšanje izkušnje gostov")
        
        return suggestions
    
    def _generate_insights(self, report: SatisfactionReport) -> List[str]:
        """Generiraj vpoglede iz poročila"""
        insights = []
        
        # Splošna ocena
        if report.average_rating >= 4.5:
            insights.append("Odličen nivo zadovoljstva gostov")
        elif report.average_rating >= 4.0:
            insights.append("Dober nivo zadovoljstva z možnostmi izboljšav")
        elif report.average_rating >= 3.5:
            insights.append("Povprečen nivo zadovoljstva - potrebne izboljšave")
        else:
            insights.append("Nizek nivo zadovoljstva - kritične izboljšave potrebne")
        
        # NPS analiza
        if report.nps_score >= 50:
            insights.append("Odličen NPS rezultat - gostje so lojalni promotorji")
        elif report.nps_score >= 0:
            insights.append("Pozitiven NPS - več promotorjev kot kritikov")
        else:
            insights.append("Negativen NPS - več kritikov kot promotorjev")
        
        # Odzivnost
        if report.response_rate >= 0.8:
            insights.append("Odličen odziv na ocene gostov")
        elif report.response_rate >= 0.5:
            insights.append("Dober odziv na ocene - možnosti za izboljšanje")
        else:
            insights.append("Slab odziv na ocene - potrebno povečanje odzivnosti")
        
        # Sentiment analiza
        positive_ratio = (report.sentiment_distribution[SentimentType.POSITIVE] + 
                         report.sentiment_distribution[SentimentType.VERY_POSITIVE]) / report.total_reviews
        
        if positive_ratio >= 0.7:
            insights.append("Večina gostov izraža pozitivne občutke")
        elif positive_ratio >= 0.5:
            insights.append("Uravnotežen sentiment z možnostmi izboljšav")
        else:
            insights.append("Prevladuje negativen sentiment - potrebne takojšnje akcije")
        
        return insights
    
    def _generate_recommendations(self, report: SatisfactionReport) -> List[str]:
        """Generiraj priporočila"""
        recommendations = []
        
        # Priporočila glede na povprečno oceno
        if report.average_rating < 4.0:
            recommendations.append("Implementirajte sistem za spremljanje kakovosti v realnem času")
            recommendations.append("Organizirajte redne sestanke za analizo feedback-a")
        
        # Priporočila glede na odzivnost
        if report.response_rate < 0.7:
            recommendations.append("Vzpostavite avtomatski sistem za odzivanje na ocene")
            recommendations.append("Določite odgovorno osebo za upravljanje ocen")
        
        # Priporočila glede na probleme
        if report.top_issues:
            recommendations.append("Prioritizirajte reševanje najpogostejših problemov")
            recommendations.append("Ustvarite akcijski načrt za vsak identificiran problem")
        
        # Splošna priporočila
        recommendations.extend([
            "Implementirajte sistem za proaktivno zbiranje feedback-a",
            "Vzpostavite program usposabljanja osebja na podlagi feedback-a",
            "Redno spremljajte konkurenco in najboljše prakse",
            "Ustvarite sistem nagrajevanja za odličen feedback"
        ])
        
        return recommendations
    
    def _save_satisfaction_report(self, report: SatisfactionReport):
        """Shrani poročilo o zadovoljstvu"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO satisfaction_reports 
                    (report_id, period_start, period_end, total_reviews,
                     average_rating, sentiment_distribution, category_ratings,
                     top_issues, improvement_suggestions, response_rate,
                     nps_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    report.report_id,
                    report.period_start.isoformat(),
                    report.period_end.isoformat(),
                    report.total_reviews,
                    report.average_rating,
                    json.dumps({k.value: v for k, v in report.sentiment_distribution.items()}),
                    json.dumps(report.category_ratings),
                    json.dumps([(issue.value, count) for issue, count in report.top_issues]),
                    json.dumps(report.improvement_suggestions),
                    report.response_rate,
                    report.nps_score,
                    report.created_at.isoformat()
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Napaka pri shranjevanju poročila: {e}")
    
    def get_pending_responses(self) -> Dict[str, Any]:
        """Pridobi ocene, ki potrebujejo odgovor"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Ocene z nizko oceno ali negativnim sentimentom
                cursor.execute('''
                    SELECT r.*, a.response_text, a.requires_human_review
                    FROM guest_reviews r
                    LEFT JOIN auto_responses a ON r.review_id = a.review_id
                    WHERE r.response_status = 'pending' 
                    AND (r.overall_rating <= 3 OR r.sentiment_type IN ('negative', 'very_negative'))
                    ORDER BY r.review_date DESC
                ''')
                
                pending_reviews = cursor.fetchall()
                
                results = []
                for review in pending_reviews:
                    results.append({
                        "review_id": review[0],
                        "guest_name": review[1],
                        "overall_rating": review[6],
                        "review_text": review[12],
                        "sentiment_type": review[16],
                        "identified_issues": json.loads(review[17]) if review[17] else [],
                        "review_date": review[14],
                        "suggested_response": review[-2] if review[-2] else None,
                        "requires_human_review": review[-1] if review[-1] else False
                    })
                
                return {
                    "success": True,
                    "pending_count": len(results),
                    "pending_reviews": results
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju čakajočih odgovorov: {e}")
            return {"success": False, "error": str(e)}
    
    def respond_to_review(self, review_id: str, response_text: str, 
                         staff_member: str) -> Dict[str, Any]:
        """Odgovori na oceno gosta"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE guest_reviews 
                    SET staff_response = ?, response_date = ?, response_status = ?
                    WHERE review_id = ?
                ''', (
                    response_text,
                    datetime.now().isoformat(),
                    ResponseStatus.RESPONDED.value,
                    review_id
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "review_id": review_id,
                    "message": f"Odgovor uspešno poslan - {staff_member}"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri odgovarjanju na oceno: {e}")
            return {"success": False, "error": str(e)}
    
    def get_satisfaction_dashboard(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard zadovoljstva"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Zadnji mesec statistike
                last_month = datetime.now() - timedelta(days=30)
                
                cursor = conn.cursor()
                
                # Osnovne statistike
                cursor.execute('''
                    SELECT 
                        COUNT(*) as total_reviews,
                        AVG(overall_rating) as avg_rating,
                        COUNT(CASE WHEN response_status != 'pending' THEN 1 END) as responded_count
                    FROM guest_reviews 
                    WHERE review_date >= ?
                ''', (last_month.isoformat(),))
                
                stats = cursor.fetchone()
                
                # Sentiment distribucija
                cursor.execute('''
                    SELECT sentiment_type, COUNT(*) 
                    FROM guest_reviews 
                    WHERE review_date >= ? AND sentiment_type IS NOT NULL
                    GROUP BY sentiment_type
                ''', (last_month.isoformat(),))
                
                sentiment_data = dict(cursor.fetchall())
                
                # Najpogostejši problemi
                cursor.execute('''
                    SELECT identified_issues 
                    FROM guest_reviews 
                    WHERE review_date >= ? AND identified_issues IS NOT NULL
                ''', (last_month.isoformat(),))
                
                issues_data = cursor.fetchall()
                all_issues = []
                for issues_json in issues_data:
                    try:
                        issues = json.loads(issues_json[0])
                        all_issues.extend(issues)
                    except:
                        continue
                
                issue_counts = Counter(all_issues)
                
                # Trend podatki (zadnjih 7 dni)
                trend_data = []
                for i in range(7):
                    day = datetime.now() - timedelta(days=i)
                    cursor.execute('''
                        SELECT AVG(overall_rating), COUNT(*)
                        FROM guest_reviews 
                        WHERE DATE(review_date) = DATE(?)
                    ''', (day.isoformat(),))
                    
                    day_stats = cursor.fetchone()
                    trend_data.append({
                        "date": day.strftime("%Y-%m-%d"),
                        "avg_rating": day_stats[0] if day_stats[0] else 0,
                        "review_count": day_stats[1]
                    })
                
                return {
                    "success": True,
                    "period": "Zadnjih 30 dni",
                    "summary": {
                        "total_reviews": stats[0],
                        "average_rating": round(stats[1], 2) if stats[1] else 0,
                        "response_rate": round((stats[2] / stats[0] * 100), 1) if stats[0] > 0 else 0,
                        "nps_estimate": 45  # Simuliran NPS
                    },
                    "sentiment_distribution": sentiment_data,
                    "top_issues": [
                        {"issue": issue, "count": count} 
                        for issue, count in issue_counts.most_common(5)
                    ],
                    "trend_data": list(reversed(trend_data)),
                    "alerts": self._get_satisfaction_alerts(),
                    "dashboard_updated": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_satisfaction_alerts(self) -> List[Dict[str, Any]]:
        """Pridobi opozorila o zadovoljstvu"""
        alerts = []
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Preveri za nizke ocene v zadnjih 24 urah
                yesterday = datetime.now() - timedelta(days=1)
                cursor.execute('''
                    SELECT COUNT(*) 
                    FROM guest_reviews 
                    WHERE review_date >= ? AND overall_rating <= 2
                ''', (yesterday.isoformat(),))
                
                low_ratings = cursor.fetchone()[0]
                
                if low_ratings > 0:
                    alerts.append({
                        "type": "critical",
                        "message": f"{low_ratings} nizkih ocen v zadnjih 24 urah",
                        "action": "Potreben takojšen odziv"
                    })
                
                # Preveri za neodgovorjene ocene
                cursor.execute('''
                    SELECT COUNT(*) 
                    FROM guest_reviews 
                    WHERE response_status = 'pending' 
                    AND overall_rating <= 3
                    AND review_date <= ?
                ''', ((datetime.now() - timedelta(days=2)).isoformat(),))
                
                pending_responses = cursor.fetchone()[0]
                
                if pending_responses > 0:
                    alerts.append({
                        "type": "warning",
                        "message": f"{pending_responses} neodgovorjenih nizkih ocen",
                        "action": "Priporočamo odziv v 24 urah"
                    })
                
                return alerts
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju opozoril: {e}")
            return []

# Primer uporabe
if __name__ == "__main__":
    satisfaction_engine = GuestSatisfactionEngine()
    
    # Dodaj testno oceno
    test_review = GuestReview(
        review_id="REV_001",
        guest_name="Janez Novak",
        guest_email="janez@example.com",
        room_number="101",
        check_in_date=date(2024, 11, 25),
        check_out_date=date(2024, 11, 27),
        overall_rating=2,
        service_rating=2,
        cleanliness_rating=3,
        location_rating=4,
        value_rating=2,
        amenities_rating=3,
        review_text="Soba je bila umazana, osebje neprijazno. Wifi ni deloval. Ne priporočam.",
        source=ReviewSource.DIRECT,
        review_date=datetime.now()
    )
    
    result = satisfaction_engine.add_guest_review(test_review)
    print(f"Dodajanje ocene: {result}")
    
    # Generiraj poročilo
    report_result = satisfaction_engine.generate_satisfaction_report(
        date.today() - timedelta(days=30),
        date.today()
    )
    print(f"Poročilo o zadovoljstvu: {report_result}")
    
    # Dashboard podatki
    dashboard_result = satisfaction_engine.get_satisfaction_dashboard()
    print(f"Dashboard podatki: {dashboard_result}")