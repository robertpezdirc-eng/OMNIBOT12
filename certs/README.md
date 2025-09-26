# SSL Certifikati

Ta direktorij vsebuje SSL certifikate za Omni Deploy projekt.

## Potrebne datoteke

- `privkey.pem` - Privatni ključ
- `fullchain.pem` - Polna veriga certifikatov

## Namestitev certifikatov

### 1. Let's Encrypt certifikati

```bash
# Kopiraj certifikate iz Let's Encrypt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./privkey.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./fullchain.pem

# Nastavi pravilne pravice
chmod 600 privkey.pem
chmod 644 fullchain.pem
```

### 2. Samopodspisani certifikati (za razvoj)

```bash
# Generiraj samopodspisane certifikate
./generate-certs.sh
```

### 3. Lastni certifikati

```bash
# Kopiraj svoje certifikate
cp /path/to/your/private.key privkey.pem
cp /path/to/your/certificate.crt fullchain.pem

# Nastavi pravilne pravice
chmod 600 privkey.pem
chmod 644 fullchain.pem
```

## Preverjanje

```bash
# Preveri, ali so certifikati pravilno nameščeni
ls -la *.pem
# Mora pokazati: privkey.pem in fullchain.pem
```

## Varnost

- Nikoli ne commitaj privatnih ključev v git
- Datoteke *.pem so dodane v .gitignore
- Privatni ključi morajo imeti pravice 600
- Certifikati morajo imeti pravice 644