"""
📢 Marketing Automation - Avtomatizacija marketinga
Napredni sistem za social media, email kampanje, oglase in promocije
"""

import sqlite3
import json
import logging
import requests
import smtplib
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import base64
import schedule
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import openai
from PIL import Image, ImageDraw, ImageFont
import io

logger = logging.getLogger(__name__)

class CampaignType(Enum):
    EMAIL = "email"
    SOCIAL_MEDIA = "social_media"
    SMS = "sms"
    PUSH_NOTIFICATION = "push_notification"
    DISPLAY_AD = "display_ad"
    SEARCH_AD = "search_ad"

class CampaignStatus(Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class SocialPlatform(Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"

class TargetAudience(Enum):
    FAMILIES = "families"
    COUPLES = "couples"
    BUSINESS = "business"
    YOUNG_ADULTS = "young_adults"
    SENIORS = "seniors"
    LOCALS = "locals"
    TOURISTS = "tourists"

class ContentType(Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    CAROUSEL = "carousel"
    STORY = "story"
    REEL = "reel"

@dataclass
class MarketingCredentials:
    """Podatki za dostop do marketing platform"""
    platform_name: str
    api_key: str
    secret_key: str
    access_token: str
    account_id: str
    page_id: Optional[str] = None
    is_active: bool = True

@dataclass
class Campaign:
    """Marketing kampanja"""
    campaign_id: str
    name: str
    campaign_type: CampaignType
    target_audience: TargetAudience
    budget: float
    start_date: datetime
    end_date: datetime
    status: CampaignStatus
    content: Dict[str, Any]
    platforms: List[str]
    metrics: Dict[str, Any]
    created_at: datetime = None
    updated_at: datetime = None

@dataclass
class Content:
    """Marketing vsebina"""
    content_id: str
    title: str
    description: str
    content_type: ContentType
    media_urls: List[str]
    hashtags: List[str]
    call_to_action: str
    target_audience: TargetAudience
    platforms: List[SocialPlatform]
    scheduled_time: Optional[datetime] = None
    is_published: bool = False

@dataclass
class Customer:
    """Stranka za marketing"""
    customer_id: str
    email: str
    phone: str
    name: str
    preferences: Dict[str, Any]
    segments: List[str]
    last_interaction: Optional[datetime] = None
    lifetime_value: float = 0.0
    is_subscribed: bool = True

@dataclass
class EmailTemplate:
    """Email predloga"""
    template_id: str
    name: str
    subject: str
    html_content: str
    text_content: str
    variables: List[str]
    category: str
    is_active: bool = True

class MarketingAutomation:
    """Glavni sistem za avtomatizacijo marketinga"""
    
    def __init__(self, db_path: str = "marketing_automation.db"):
        self.db_path = db_path
        self._init_database()
        self.credentials = {}
        self.openai_client = None
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela credentials
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS marketing_credentials (
                    platform_name TEXT PRIMARY KEY,
                    api_key TEXT,
                    secret_key TEXT,
                    access_token TEXT,
                    account_id TEXT,
                    page_id TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela kampanj
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS campaigns (
                    campaign_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    campaign_type TEXT NOT NULL,
                    target_audience TEXT NOT NULL,
                    budget REAL NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    status TEXT NOT NULL,
                    content TEXT,
                    platforms TEXT,
                    metrics TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Tabela vsebin
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS content (
                    content_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    content_type TEXT NOT NULL,
                    media_urls TEXT,
                    hashtags TEXT,
                    call_to_action TEXT,
                    target_audience TEXT,
                    platforms TEXT,
                    scheduled_time TEXT,
                    is_published BOOLEAN DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela strank
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customers (
                    customer_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    name TEXT NOT NULL,
                    preferences TEXT,
                    segments TEXT,
                    last_interaction TEXT,
                    lifetime_value REAL DEFAULT 0,
                    is_subscribed BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela email predlog
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS email_templates (
                    template_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    html_content TEXT NOT NULL,
                    text_content TEXT,
                    variables TEXT,
                    category TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela avtomatizacijskih pravil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS automation_rules (
                    rule_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    trigger_type TEXT NOT NULL,
                    trigger_conditions TEXT,
                    actions TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela metrik
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS campaign_metrics (
                    metric_id TEXT PRIMARY KEY,
                    campaign_id TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    impressions INTEGER DEFAULT 0,
                    clicks INTEGER DEFAULT 0,
                    conversions INTEGER DEFAULT 0,
                    cost REAL DEFAULT 0,
                    revenue REAL DEFAULT 0,
                    date TEXT NOT NULL,
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
                )
            ''')
            
            conn.commit()
            logger.info("🎯 Marketing Automation baza podatkov inicializirana")
    
    def add_credentials(self, credentials: MarketingCredentials) -> Dict[str, Any]:
        """Dodaj podatke za dostop do marketing platform"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO marketing_credentials 
                    (platform_name, api_key, secret_key, access_token, account_id,
                     page_id, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    credentials.platform_name,
                    credentials.api_key,
                    credentials.secret_key,
                    credentials.access_token,
                    credentials.account_id,
                    credentials.page_id,
                    credentials.is_active,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                # Shrani v memory za hitrejši dostop
                self.credentials[credentials.platform_name] = credentials
                
                return {
                    "success": True,
                    "platform": credentials.platform_name,
                    "message": f"Podatki za {credentials.platform_name} uspešno dodani"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju credentials: {e}")
            return {"success": False, "error": str(e)}
    
    def create_campaign(self, campaign: Campaign) -> Dict[str, Any]:
        """Ustvari marketing kampanjo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO campaigns 
                    (campaign_id, name, campaign_type, target_audience, budget,
                     start_date, end_date, status, content, platforms, metrics,
                     created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    campaign.campaign_id,
                    campaign.name,
                    campaign.campaign_type.value,
                    campaign.target_audience.value,
                    campaign.budget,
                    campaign.start_date.isoformat(),
                    campaign.end_date.isoformat(),
                    campaign.status.value,
                    json.dumps(campaign.content),
                    json.dumps(campaign.platforms),
                    json.dumps(campaign.metrics),
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "campaign_id": campaign.campaign_id,
                    "message": f"Kampanja '{campaign.name}' uspešno ustvarjena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju kampanje: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_ai_content(self, prompt: str, content_type: ContentType, 
                          target_audience: TargetAudience) -> Dict[str, Any]:
        """Generiraj vsebino z AI"""
        try:
            if not self.openai_client:
                return {"success": False, "error": "OpenAI API ni konfiguriran"}
            
            # Prilagodi prompt glede na tip vsebine in ciljno skupino
            audience_context = {
                TargetAudience.FAMILIES: "družine z otroki, poudarek na varnosti in zabavi",
                TargetAudience.COUPLES: "pari, romantične izkušnje, intimnost",
                TargetAudience.BUSINESS: "poslovni gostje, profesionalnost, učinkovitost",
                TargetAudience.YOUNG_ADULTS: "mladi odrasli, avanture, družabnost",
                TargetAudience.SENIORS: "starejši, udobje, mir, tradicija",
                TargetAudience.LOCALS: "lokalni prebivalci, posebne ponudbe",
                TargetAudience.TOURISTS: "turisti, znamenitosti, lokalne izkušnje"
            }
            
            content_instructions = {
                ContentType.TEXT: "Napiši privlačen tekst",
                ContentType.IMAGE: "Opiši sliko, ki bi jo rad ustvaril",
                ContentType.VIDEO: "Napiši scenarij za kratek video",
                ContentType.CAROUSEL: "Ustvari serijo povezanih objav",
                ContentType.STORY: "Napiši zgodbo za Instagram/Facebook story",
                ContentType.REEL: "Ustvari koncept za kratek video reel"
            }
            
            full_prompt = f"""
            {content_instructions[content_type]} za {audience_context[target_audience]}.
            
            Kontekst: {prompt}
            
            Zahteve:
            - Jezik: slovenščina
            - Ton: prijazen, privlačen, profesionalen
            - Dolžina: primerna za social media
            - Vključi call-to-action
            - Dodaj relevantne hashtage
            
            Generiraj:
            1. Glavni tekst/opis
            2. Naslov (če primerno)
            3. Call-to-action
            4. 5-10 relevantnih hashtagov
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Si strokovnjak za marketing v turizmu in gostinstvu. Ustvarjaš privlačne vsebine za social media."},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            ai_content = response.choices[0].message.content
            
            # Parsiraj odgovor
            lines = ai_content.split('\n')
            
            result = {
                "success": True,
                "content_type": content_type.value,
                "target_audience": target_audience.value,
                "generated_content": ai_content,
                "parsed_content": {
                    "main_text": "",
                    "title": "",
                    "call_to_action": "",
                    "hashtags": []
                }
            }
            
            # Poskusi parsirati strukturirane podatke
            current_section = None
            for line in lines:
                line = line.strip()
                if "naslov" in line.lower() or "title" in line.lower():
                    current_section = "title"
                elif "call-to-action" in line.lower() or "cta" in line.lower():
                    current_section = "cta"
                elif "hashtag" in line.lower():
                    current_section = "hashtags"
                elif line.startswith('#'):
                    result["parsed_content"]["hashtags"].extend([tag.strip() for tag in line.split() if tag.startswith('#')])
                elif current_section == "title" and line:
                    result["parsed_content"]["title"] = line
                elif current_section == "cta" and line:
                    result["parsed_content"]["call_to_action"] = line
                elif not current_section and line:
                    result["parsed_content"]["main_text"] += line + " "
            
            return result
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju AI vsebine: {e}")
            return {"success": False, "error": str(e)}
    
    def create_content(self, content: Content) -> Dict[str, Any]:
        """Ustvari marketing vsebino"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO content 
                    (content_id, title, description, content_type, media_urls,
                     hashtags, call_to_action, target_audience, platforms,
                     scheduled_time, is_published, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    content.content_id,
                    content.title,
                    content.description,
                    content.content_type.value,
                    json.dumps(content.media_urls),
                    json.dumps(content.hashtags),
                    content.call_to_action,
                    content.target_audience.value,
                    json.dumps([p.value for p in content.platforms]),
                    content.scheduled_time.isoformat() if content.scheduled_time else None,
                    content.is_published,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "content_id": content.content_id,
                    "message": f"Vsebina '{content.title}' uspešno ustvarjena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju vsebine: {e}")
            return {"success": False, "error": str(e)}
    
    def publish_to_social_media(self, content_id: str) -> Dict[str, Any]:
        """Objavi vsebino na social media"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi vsebino
                cursor.execute('''
                    SELECT title, description, content_type, media_urls, hashtags,
                           call_to_action, platforms
                    FROM content WHERE content_id = ?
                ''', (content_id,))
                
                result = cursor.fetchone()
                if not result:
                    return {"success": False, "error": "Vsebina ne obstaja"}
                
                title, description, content_type, media_urls, hashtags, call_to_action, platforms = result
                
                media_urls = json.loads(media_urls)
                hashtags = json.loads(hashtags)
                platforms = json.loads(platforms)
                
                # Sestavi objavo
                post_text = f"{title}\n\n{description}\n\n{call_to_action}\n\n{' '.join(hashtags)}"
                
                results = {}
                
                # Objavi na vsaki platformi
                for platform in platforms:
                    try:
                        if platform == "facebook":
                            result = self._publish_to_facebook(post_text, media_urls)
                        elif platform == "instagram":
                            result = self._publish_to_instagram(post_text, media_urls)
                        elif platform == "twitter":
                            result = self._publish_to_twitter(post_text, media_urls)
                        elif platform == "linkedin":
                            result = self._publish_to_linkedin(post_text, media_urls)
                        else:
                            result = {"success": False, "error": f"Platforma {platform} ni podprta"}
                        
                        results[platform] = result
                        
                    except Exception as e:
                        results[platform] = {"success": False, "error": str(e)}
                
                # Označi kot objavljeno, če je vsaj ena platforma uspešna
                if any(r.get("success") for r in results.values()):
                    cursor.execute('''
                        UPDATE content SET is_published = 1 WHERE content_id = ?
                    ''', (content_id,))
                    conn.commit()
                
                return {
                    "success": True,
                    "content_id": content_id,
                    "platform_results": results
                }
                
        except Exception as e:
            logger.error(f"Napaka pri objavljanju na social media: {e}")
            return {"success": False, "error": str(e)}
    
    def _publish_to_facebook(self, text: str, media_urls: List[str]) -> Dict[str, Any]:
        """Objavi na Facebook"""
        try:
            if "facebook" not in self.credentials:
                return {"success": False, "error": "Facebook credentials manjkajo"}
            
            creds = self.credentials["facebook"]
            
            # Facebook Graph API
            url = f"https://graph.facebook.com/v18.0/{creds.page_id}/posts"
            
            data = {
                "message": text,
                "access_token": creds.access_token
            }
            
            # Dodaj sliko, če obstaja
            if media_urls:
                data["link"] = media_urls[0]
            
            response = requests.post(url, data=data)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "post_id": result.get("id"),
                    "message": "Facebook objava uspešna"
                }
            else:
                return {"success": False, "error": f"Facebook API napaka: {response.text}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _publish_to_instagram(self, text: str, media_urls: List[str]) -> Dict[str, Any]:
        """Objavi na Instagram"""
        try:
            if "instagram" not in self.credentials:
                return {"success": False, "error": "Instagram credentials manjkajo"}
            
            creds = self.credentials["instagram"]
            
            # Instagram Basic Display API
            # Opomba: Instagram zahteva predhodno odobritev za objavljanje
            
            return {
                "success": True,
                "message": "Instagram objava simulirana (potrebna je odobritev API-ja)"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _publish_to_twitter(self, text: str, media_urls: List[str]) -> Dict[str, Any]:
        """Objavi na Twitter/X"""
        try:
            if "twitter" not in self.credentials:
                return {"success": False, "error": "Twitter credentials manjkajo"}
            
            # Twitter API v2
            # Opomba: Twitter API zahteva posebne odobritve
            
            return {
                "success": True,
                "message": "Twitter objava simulirana (potrebna je odobritev API-ja)"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _publish_to_linkedin(self, text: str, media_urls: List[str]) -> Dict[str, Any]:
        """Objavi na LinkedIn"""
        try:
            if "linkedin" not in self.credentials:
                return {"success": False, "error": "LinkedIn credentials manjkajo"}
            
            # LinkedIn API
            # Opomba: LinkedIn API zahteva posebne odobritve
            
            return {
                "success": True,
                "message": "LinkedIn objava simulirana (potrebna je odobritev API-ja)"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def send_email_campaign(self, campaign_id: str, template_id: str, 
                          customer_segments: List[str]) -> Dict[str, Any]:
        """Pošlji email kampanjo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi email predlogo
                cursor.execute('''
                    SELECT name, subject, html_content, text_content, variables
                    FROM email_templates WHERE template_id = ? AND is_active = 1
                ''', (template_id,))
                
                template_result = cursor.fetchone()
                if not template_result:
                    return {"success": False, "error": "Email predloga ne obstaja"}
                
                template_name, subject, html_content, text_content, variables = template_result
                variables = json.loads(variables) if variables else []
                
                # Pridobi stranke iz segmentov
                segment_conditions = " OR ".join([f"segments LIKE '%{seg}%'" for seg in customer_segments])
                
                cursor.execute(f'''
                    SELECT customer_id, email, name, preferences
                    FROM customers 
                    WHERE is_subscribed = 1 AND ({segment_conditions})
                ''', ())
                
                customers = cursor.fetchall()
                
                if not customers:
                    return {"success": False, "error": "Ni strank za pošiljanje"}
                
                # SMTP konfiguracija (prilagodi glede na ponudnika)
                smtp_config = {
                    "host": "smtp.gmail.com",  # Prilagodi
                    "port": 587,
                    "username": "your-email@gmail.com",  # Prilagodi
                    "password": "your-app-password"  # Prilagodi
                }
                
                sent_count = 0
                failed_count = 0
                
                for customer_id, email, name, preferences in customers:
                    try:
                        # Personaliziraj vsebino
                        personalized_subject = subject.replace("{name}", name)
                        personalized_html = html_content.replace("{name}", name)
                        personalized_text = text_content.replace("{name}", name) if text_content else ""
                        
                        # Dodaj dodatne personalizacije
                        if preferences:
                            prefs = json.loads(preferences)
                            for key, value in prefs.items():
                                personalized_html = personalized_html.replace(f"{{{key}}}", str(value))
                                personalized_text = personalized_text.replace(f"{{{key}}}", str(value))
                        
                        # Pošlji email
                        success = self._send_email(
                            smtp_config,
                            email,
                            personalized_subject,
                            personalized_html,
                            personalized_text
                        )
                        
                        if success:
                            sent_count += 1
                        else:
                            failed_count += 1
                            
                    except Exception as e:
                        logger.error(f"Napaka pri pošiljanju emaila {email}: {e}")
                        failed_count += 1
                
                # Posodobi kampanjo
                cursor.execute('''
                    UPDATE campaigns 
                    SET metrics = json_set(COALESCE(metrics, '{}'), '$.emails_sent', ?)
                    WHERE campaign_id = ?
                ''', (sent_count, campaign_id))
                
                conn.commit()
                
                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "emails_sent": sent_count,
                    "emails_failed": failed_count,
                    "total_customers": len(customers),
                    "message": f"Email kampanja poslana: {sent_count} uspešnih, {failed_count} neuspešnih"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju email kampanje: {e}")
            return {"success": False, "error": str(e)}
    
    def _send_email(self, smtp_config: Dict[str, Any], to_email: str, 
                   subject: str, html_content: str, text_content: str) -> bool:
        """Pošlji posamezen email"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = smtp_config["username"]
            msg['To'] = to_email
            
            # Dodaj text in HTML verzijo
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
            
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Pošlji preko SMTP
            with smtplib.SMTP(smtp_config["host"], smtp_config["port"]) as server:
                server.starttls()
                server.login(smtp_config["username"], smtp_config["password"])
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            logger.error(f"SMTP napaka: {e}")
            return False
    
    def create_email_template(self, template: EmailTemplate) -> Dict[str, Any]:
        """Ustvari email predlogo"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO email_templates 
                    (template_id, name, subject, html_content, text_content,
                     variables, category, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    template.template_id,
                    template.name,
                    template.subject,
                    template.html_content,
                    template.text_content,
                    json.dumps(template.variables),
                    template.category,
                    template.is_active,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "template_id": template.template_id,
                    "message": f"Email predloga '{template.name}' uspešno ustvarjena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju email predloge: {e}")
            return {"success": False, "error": str(e)}
    
    def add_customer(self, customer: Customer) -> Dict[str, Any]:
        """Dodaj stranko"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO customers 
                    (customer_id, email, phone, name, preferences, segments,
                     last_interaction, lifetime_value, is_subscribed, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    customer.customer_id,
                    customer.email,
                    customer.phone,
                    customer.name,
                    json.dumps(customer.preferences),
                    json.dumps(customer.segments),
                    customer.last_interaction.isoformat() if customer.last_interaction else None,
                    customer.lifetime_value,
                    customer.is_subscribed,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "customer_id": customer.customer_id,
                    "message": f"Stranka '{customer.name}' uspešno dodana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju stranke: {e}")
            return {"success": False, "error": str(e)}
    
    def get_campaign_analytics(self, campaign_id: str) -> Dict[str, Any]:
        """Pridobi analitiko kampanje"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Osnovni podatki kampanje
                cursor.execute('''
                    SELECT name, campaign_type, budget, start_date, end_date,
                           status, platforms, metrics
                    FROM campaigns WHERE campaign_id = ?
                ''', (campaign_id,))
                
                campaign_result = cursor.fetchone()
                if not campaign_result:
                    return {"success": False, "error": "Kampanja ne obstaja"}
                
                name, campaign_type, budget, start_date, end_date, status, platforms, metrics = campaign_result
                
                # Metrike po platformah
                cursor.execute('''
                    SELECT platform, SUM(impressions), SUM(clicks), SUM(conversions),
                           SUM(cost), SUM(revenue)
                    FROM campaign_metrics 
                    WHERE campaign_id = ?
                    GROUP BY platform
                ''', (campaign_id,))
                
                platform_metrics = cursor.fetchall()
                
                # Dnevne metrike
                cursor.execute('''
                    SELECT date, SUM(impressions), SUM(clicks), SUM(conversions),
                           SUM(cost), SUM(revenue)
                    FROM campaign_metrics 
                    WHERE campaign_id = ?
                    GROUP BY date
                    ORDER BY date DESC
                    LIMIT 30
                ''', (campaign_id,))
                
                daily_metrics = cursor.fetchall()
                
                # Izračunaj KPI-je
                total_impressions = sum(m[1] for m in platform_metrics)
                total_clicks = sum(m[2] for m in platform_metrics)
                total_conversions = sum(m[3] for m in platform_metrics)
                total_cost = sum(m[4] for m in platform_metrics)
                total_revenue = sum(m[5] for m in platform_metrics)
                
                ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
                conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
                roas = (total_revenue / total_cost) if total_cost > 0 else 0
                cpc = (total_cost / total_clicks) if total_clicks > 0 else 0
                
                return {
                    "success": True,
                    "campaign_info": {
                        "campaign_id": campaign_id,
                        "name": name,
                        "type": campaign_type,
                        "budget": budget,
                        "start_date": start_date,
                        "end_date": end_date,
                        "status": status,
                        "platforms": json.loads(platforms) if platforms else []
                    },
                    "overall_metrics": {
                        "impressions": total_impressions,
                        "clicks": total_clicks,
                        "conversions": total_conversions,
                        "cost": round(total_cost, 2),
                        "revenue": round(total_revenue, 2),
                        "ctr": round(ctr, 2),
                        "conversion_rate": round(conversion_rate, 2),
                        "roas": round(roas, 2),
                        "cpc": round(cpc, 2)
                    },
                    "platform_breakdown": [
                        {
                            "platform": m[0],
                            "impressions": m[1],
                            "clicks": m[2],
                            "conversions": m[3],
                            "cost": round(m[4], 2),
                            "revenue": round(m[5], 2)
                        } for m in platform_metrics
                    ],
                    "daily_performance": [
                        {
                            "date": d[0],
                            "impressions": d[1],
                            "clicks": d[2],
                            "conversions": d[3],
                            "cost": round(d[4], 2),
                            "revenue": round(d[5], 2)
                        } for d in daily_metrics
                    ],
                    "generated_at": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju analitike: {e}")
            return {"success": False, "error": str(e)}
    
    def schedule_automated_campaigns(self) -> Dict[str, Any]:
        """Razporedi avtomatizirane kampanje"""
        try:
            # Dnevne objave na social media
            schedule.every().day.at("09:00").do(self._daily_social_media_post)
            schedule.every().day.at("18:00").do(self._evening_social_media_post)
            
            # Tedenski newsletter
            schedule.every().monday.at("10:00").do(self._weekly_newsletter)
            
            # Mesečne promocije
            schedule.every().month.do(self._monthly_promotion_campaign)
            
            # Sezonske kampanje
            schedule.every().day.at("08:00").do(self._check_seasonal_campaigns)
            
            return {
                "success": True,
                "scheduled_tasks": [
                    "Dnevne social media objave (9:00, 18:00)",
                    "Tedenski newsletter (ponedeljek 10:00)",
                    "Mesečne promocije",
                    "Sezonske kampanje (preverjanje dnevno)"
                ],
                "message": "Avtomatizirane kampanje uspešno razporejene"
            }
            
        except Exception as e:
            logger.error(f"Napaka pri razporejanju kampanj: {e}")
            return {"success": False, "error": str(e)}
    
    def _daily_social_media_post(self):
        """Dnevna social media objava"""
        try:
            # Generiraj vsebino za danes
            today_prompt = f"Ustvari privlačno objavo za hotel/restavracijo za {datetime.now().strftime('%A, %d. %B %Y')}. Vključi dnevno ponudbo ali posebnost."
            
            content_result = self.generate_ai_content(
                today_prompt,
                ContentType.TEXT,
                TargetAudience.TOURISTS
            )
            
            if content_result.get("success"):
                # Ustvari content objekt
                content = Content(
                    content_id=f"daily_{datetime.now().strftime('%Y%m%d')}",
                    title="Dnevna objava",
                    description=content_result["parsed_content"]["main_text"],
                    content_type=ContentType.TEXT,
                    media_urls=[],
                    hashtags=content_result["parsed_content"]["hashtags"],
                    call_to_action=content_result["parsed_content"]["call_to_action"],
                    target_audience=TargetAudience.TOURISTS,
                    platforms=[SocialPlatform.FACEBOOK, SocialPlatform.INSTAGRAM],
                    is_published=False
                )
                
                # Ustvari in objavi
                create_result = self.create_content(content)
                if create_result.get("success"):
                    self.publish_to_social_media(content.content_id)
                    
        except Exception as e:
            logger.error(f"Napaka pri dnevni objavi: {e}")
    
    def _weekly_newsletter(self):
        """Tedenski newsletter"""
        try:
            # Generiraj vsebino za tedenski newsletter
            newsletter_content = self.generate_ai_content(
                "Ustvari vsebino za tedenski newsletter z dogodki, posebnimi ponudbami in novicami",
                ContentType.TEXT,
                TargetAudience.TOURISTS
            )
            
            if newsletter_content.get("success"):
                # Pošlji newsletter vsem naročnikom
                self.send_email_campaign(
                    f"newsletter_{datetime.now().strftime('%Y%W')}",
                    "weekly_newsletter_template",
                    ["newsletter_subscribers", "vip_customers"]
                )
                
        except Exception as e:
            logger.error(f"Napaka pri tedenskem newsletterju: {e}")
    
    def run_automation_scheduler(self):
        """Zaženi avtomatizacijski razporejevalnik"""
        logger.info("🤖 Marketing automation scheduler zagnan")
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Preveri vsako minuto

# Primer uporabe
if __name__ == "__main__":
    marketing = MarketingAutomation()
    
    # Dodaj Facebook credentials
    fb_creds = MarketingCredentials(
        platform_name="facebook",
        api_key="your_app_id",
        secret_key="your_app_secret",
        access_token="your_page_access_token",
        account_id="your_ad_account_id",
        page_id="your_page_id"
    )
    
    creds_result = marketing.add_credentials(fb_creds)
    print(f"Facebook credentials: {creds_result}")
    
    # Ustvari email predlogo
    welcome_template = EmailTemplate(
        template_id="welcome_001",
        name="Dobrodošli",
        subject="Dobrodošli v {hotel_name}!",
        html_content="""
        <html>
        <body>
            <h1>Dobrodošli, {name}!</h1>
            <p>Hvala, ker ste se odločili za naš hotel. Pripravili smo posebne ponudbe samo za vas.</p>
            <p>Vaš osebni popust: <strong>{discount_code}</strong></p>
            <a href="{website_url}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none;">Rezerviraj zdaj</a>
        </body>
        </html>
        """,
        text_content="Dobrodošli, {name}! Hvala, ker ste se odločili za naš hotel. Vaš popust: {discount_code}",
        variables=["name", "hotel_name", "discount_code", "website_url"],
        category="welcome"
    )
    
    template_result = marketing.create_email_template(welcome_template)
    print(f"Email predloga: {template_result}")
    
    # Dodaj stranko
    customer = Customer(
        customer_id="CUST_001",
        email="test@example.com",
        phone="+386 40 123 456",
        name="Janez Novak",
        preferences={"hotel_name": "Hotel Slovenija", "discount_code": "WELCOME20"},
        segments=["newsletter_subscribers", "new_customers"],
        lifetime_value=250.0
    )
    
    customer_result = marketing.add_customer(customer)
    print(f"Dodajanje stranke: {customer_result}")
    
    # Ustvari kampanjo
    campaign = Campaign(
        campaign_id="CAMP_001",
        name="Poletna promocija 2024",
        campaign_type=CampaignType.SOCIAL_MEDIA,
        target_audience=TargetAudience.FAMILIES,
        budget=1000.0,
        start_date=datetime.now(),
        end_date=datetime.now() + timedelta(days=30),
        status=CampaignStatus.ACTIVE,
        content={"theme": "summer", "discount": "20%"},
        platforms=["facebook", "instagram"],
        metrics={}
    )
    
    campaign_result = marketing.create_campaign(campaign)
    print(f"Ustvarjanje kampanje: {campaign_result}")
    
    # Razporedi avtomatizirane kampanje
    schedule_result = marketing.schedule_automated_campaigns()
    print(f"Razporejanje kampanj: {schedule_result}")