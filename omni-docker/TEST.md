# 🧪 Omni License System - Testiranje Docker Setup

## Predpogoji za testiranje

1. Docker Desktop mora biti nameščen in zagnan
2. Vsi porti (3000, 3001, 3002, 27017) morajo biti prosti
3. Najmanj 2GB prostega RAM-a

## 🔍 Osnovni testi

### 1. Test Docker konfiguracije

```bash
# Preveri docker-compose konfiguracijo
docker-compose config

# Pričakovani rezultat: Brez napak, izpis YAML konfiguracije
```

### 2. Test gradnje slik

```bash
# Gradi vse Docker slike
docker-compose build

# Pričakovani rezultat: Uspešna gradnja vseh slik
# - omni-docker_omni-server
# - omni-docker_omni-admin  
# - omni-docker_omni-client
```

### 3. Test zagona storitev

```bash
# Zaženi osnovni setup
docker-compose up -d mongodb omni-server omni-admin

# Preveri status
docker-compose ps

# Pričakovani rezultat: Vse storitve "Up" in "healthy"
```

## 🌐 Testi dostopnosti

### 1. Test API Server-ja

```bash
# Test osnovne dostopnosti
curl http://localhost:3000/health

# Pričakovani odgovor: {"status": "ok", "timestamp": "..."}

# Test statistik
curl http://localhost:3000/api/license/stats

# Pričakovani odgovor: JSON z statistikami
```

### 2. Test Admin GUI

```bash
# Test dostopnosti
curl -I http://localhost:3001

# Pričakovani odgovor: HTTP/1.1 200 OK

# Odpri v brskalniku
# http://localhost:3001
# Pričakovano: Admin vmesnik se naloži
```

### 3. Test Client Panel (če zagnan)

```bash
# Test dostopnosti
curl -I http://localhost:3002

# Pričakovani odgovor: HTTP/1.1 200 OK

# Odpri v brskalniku  
# http://localhost:3002
# Pričakovano: Client panel se naloži
```

## 🗄️ Testi MongoDB

### 1. Test povezave z MongoDB

```bash
# Poveži se v MongoDB container
docker-compose exec mongodb mongosh -u omni_admin -p secure_password_123 --authenticationDatabase admin

# V MongoDB shell-u:
use omni_licenses
show collections

# Pričakovano: Prikaz baz podatkov in kolekcij
```

### 2. Test podatkovne baze

```bash
# Preveri ali se ustvarijo potrebne kolekcije
docker-compose exec mongodb mongosh -u omni_admin -p secure_password_123 --authenticationDatabase admin omni_licenses --eval "db.getCollectionNames()"

# Pričakovano: ["licenses", "refreshtokens", "activitylogs"]
```

## 🔐 Varnostni testi

### 1. Test JWT avtentikacije

```bash
# Test brez avtentikacije (mora biti zavrnjen)
curl http://localhost:3000/api/license/all

# Pričakovani odgovor: 401 Unauthorized

# Test z napačnim tokenom
curl -H "Authorization: Bearer invalid_token" http://localhost:3000/api/license/all

# Pričakovani odgovor: 401 Unauthorized
```

### 2. Test rate limiting

```bash
# Pošlji več zahtev zapored (preko limita)
for i in {1..20}; do curl http://localhost:3000/api/license/stats; done

# Pričakovano: Po določenem številu zahtev 429 Too Many Requests
```

## 📊 Testi funkcionalnosti

### 1. Test ustvarjanja licence

```bash
# Ustvari testno licenco (potreben admin token)
curl -X POST http://localhost:3000/api/license/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "client_id": "test_client_001",
    "license_type": "premium",
    "duration_days": 30,
    "features": ["feature1", "feature2"]
  }'

# Pričakovani odgovor: JSON z novo licenco
```

### 2. Test preverjanja licence

```bash
# Preveri licenco
curl -X POST http://localhost:3000/api/license/check \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test_client_001",
    "license_key": "GENERATED_LICENSE_KEY"
  }'

# Pričakovani odgovor: {"valid": true, "license": {...}}
```

## 🔄 Testi vzdržljivosti

### 1. Test restart-a

```bash
# Ustavi storitve
docker-compose down

# Zaženi ponovno
docker-compose up -d

# Preveri ali vse deluje
docker-compose ps
curl http://localhost:3000/health
```

### 2. Test volume persistance

```bash
# Ustvari testne podatke
# Ustavi storitve
docker-compose down

# Zaženi ponovno
docker-compose up -d

# Preveri ali podatki obstajajo
# Podatki morajo biti ohranjeni
```

## 📈 Performance testi

### 1. Test odzivnosti

```bash
# Meri odzivni čas API-ja
time curl http://localhost:3000/api/license/stats

# Pričakovano: < 500ms za osnovne zahteve
```

### 2. Test obremenitve

```bash
# Uporabi Apache Bench (če je nameščen)
ab -n 100 -c 10 http://localhost:3000/api/license/stats

# Pričakovano: Uspešno obdelanih 100 zahtev
```

## 🐛 Debug testi

### 1. Test logov

```bash
# Preveri loge vseh storitev
docker-compose logs --tail=50

# Pričakovano: Brez ERROR sporočil
```

### 2. Test health check-ov

```bash
# Preveri zdravje storitev
docker-compose ps

# Vse storitve morajo biti "healthy"
```

## 📋 Test checklist

- [ ] Docker konfiguracija je veljavna
- [ ] Vse Docker slike se uspešno zgradijo
- [ ] MongoDB se zažene in je dostopen
- [ ] API Server se zažene na portu 3000
- [ ] Admin GUI se zažene na portu 3001
- [ ] Client Panel se zažene na portu 3002 (če zagnan)
- [ ] Health check endpoint deluje
- [ ] API endpoints odgovarjajo
- [ ] JWT avtentikacija deluje
- [ ] Rate limiting deluje
- [ ] Podatki se ohranijo po restart-u
- [ ] Logi ne vsebujejo kritičnih napak
- [ ] Vse storitve so "healthy"

## 🚨 Troubleshooting testov

### Če testi ne uspejo:

1. **Preveri Docker status**
   ```bash
   docker --version
   docker-compose --version
   docker system info
   ```

2. **Preveri porte**
   ```bash
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   netstat -ano | findstr :27017
   ```

3. **Preveri loge**
   ```bash
   docker-compose logs omni-server
   docker-compose logs mongodb
   docker-compose logs omni-admin
   ```

4. **Preveri disk prostor**
   ```bash
   docker system df
   ```

5. **Počisti in poskusi ponovno**
   ```bash
   docker-compose down -v
   docker system prune -f
   docker-compose build --no-cache
   docker-compose up -d
   ```

## 📝 Poročanje o testih

Po izvedbi testov ustvari poročilo:

```
Datum testiranja: [DATUM]
Verzija Docker: [VERZIJA]
OS: [OPERACIJSKI SISTEM]

Uspešni testi:
- [✓] Test 1
- [✓] Test 2
- [✗] Test 3 - Razlog neuspeha

Opombe:
- [DODATNE OPOMBE]
```

---

**Opomba**: Vsi testi morajo biti uspešni pred produkcijsko uporabo sistema.