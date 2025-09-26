# SSL Certifikati za Omni Sistem

Ta mapa vsebuje SSL certifikate, potrebne za varno delovanje Omni sistema.

## Potrebne datoteke

Postavite naslednje datoteke v to mapo:

### 1. Privatni ključ
```
privkey.pem
```
- Privatni ključ za SSL certifikat
- **POZOR**: Ta datoteka mora biti varovana in ne sme biti dostopna javnosti

### 2. Celotna veriga certifikatov
```
fullchain.pem
```
- Vsebuje vaš SSL certifikat in vmesne certifikate
- Ta datoteka se lahko deli javno

## Pridobitev SSL certifikatov

### Možnost 1: Let's Encrypt (Brezplačno)
```bash
# Namestite certbot
sudo apt-get install certbot

# Pridobite certifikat
sudo certbot certonly --standalone -d yourdomain.com

# Kopirajte certifikate
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./privkey.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./fullchain.pem
```

### Možnost 2: Komercialni certifikat
1. Kupite SSL certifikat pri ponudniku (npr. DigiCert, Comodo, itd.)
2. Sledite navodilom ponudnika za generiranje CSR
3. Prenesite pridobljene datoteke in jih preimenujte v `privkey.pem` in `fullchain.pem`

### Možnost 3: Samo-podpisan certifikat (samo za testiranje)
```bash
# Generirajte samo-podpisan certifikat
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes

# Vnesite podatke o organizaciji
```

## Varnostni nasveti

1. **Nikoli ne delite privatnega ključa** (`privkey.pem`)
2. **Nastavite pravilne pravice dostopa**:
   ```bash
   chmod 600 privkey.pem
   chmod 644 fullchain.pem
   ```
3. **Redno posodabljajte certifikate** (priporočeno vsakih 90 dni za Let's Encrypt)
4. **Varnostno kopirajte certifikate** na varno lokacijo

## Avtomatska obnova (Let's Encrypt)

Dodajte v crontab za avtomatsko obnovo:
```bash
# Odprite crontab
crontab -e

# Dodajte vrstico za obnovo vsakih 60 dni
0 0 */60 * * certbot renew --quiet && docker-compose restart nginx server admin
```

## Preverjanje certifikatov

```bash
# Preverite veljavnost certifikata
openssl x509 -in fullchain.pem -text -noout

# Preverite ujemanje ključa in certifikata
openssl x509 -noout -modulus -in fullchain.pem | openssl md5
openssl rsa -noout -modulus -in privkey.pem | openssl md5
```

## Struktura datotek

```
certs/
├── README.md          # Ta datoteka
├── privkey.pem        # Privatni ključ (dodajte vi)
├── fullchain.pem      # Celotna veriga certifikatov (dodajte vi)
└── .gitignore         # Preprečuje commit certifikatov v git
```

## Odpravljanje težav

### Napaka: "Certificate not found"
- Preverite, ali sta datoteki `privkey.pem` in `fullchain.pem` v tej mapi
- Preverite pravice dostopa do datotek

### Napaka: "Certificate expired"
- Obnovite certifikat z `certbot renew`
- Ponovno zaženite Docker kontejnerje

### Napaka: "Certificate mismatch"
- Preverite, ali privatni ključ ustreza certifikatu
- Uporabite zgoraj navedene ukaze za preverjanje

## Podpora

Za dodatno pomoč pri SSL certifikatih se obrnite na:
- Let's Encrypt dokumentacija: https://letsencrypt.org/docs/
- OpenSSL dokumentacija: https://www.openssl.org/docs/