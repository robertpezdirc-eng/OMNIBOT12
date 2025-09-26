# 🔧 Google Custom Search API - Navodila za nastavitev

## 📋 Korak 1: Ustvari Google Custom Search Engine

1. **Pojdi na:** https://programmablesearchengine.google.com/
2. **Klikni:** "Add" ali "Create search engine"
3. **Nastavi:**
   - **Sites to search:** `*` (za iskanje po celotnem spletu)
   - **Language:** Slovenščina ali English
   - **Search engine name:** "Omni Universal Search"

## 📋 Korak 2: Pridobi Search Engine ID (CSE ID)

1. **V Control Panel** najdi svoj search engine
2. **Klikni** na ime search engine-a
3. **V "Overview" sekciji** najdi **"Search engine ID"**
4. **Kopiraj** ta ID (format: `abc123def456:ghi789jkl`)

## 📋 Korak 3: Posodobi .env.local datoteko

```bash
GEMINI_API_KEY=PLACEHOLDER_API_KEY
OPENAI_API_KEY=your_openai_key_here
GOOGLE_API_KEY=AIzaSyBuXSaDaxaIGtp0unxdBzKI_F08O3iuO0A
GOOGLE_CSE_ID=tvoj_search_engine_id_tukaj
```

## 📋 Korak 4: Omogoči Custom Search API

1. **Pojdi na:** https://console.developers.google.com/
2. **Izberi** svoj projekt ali ustvari novega
3. **Pojdi na:** "APIs & Services" > "Library"
4. **Poišči:** "Custom Search API"
5. **Klikni:** "Enable"

## 📋 Korak 5: Preveri nastavitve

Po nastavitvi bo Google Search v Omni sistemu deloval avtomatsko:

```
🌍 Google rezultati:
• Naslov rezultata 1
  Opis rezultata...
  https://example.com

• Naslov rezultata 2
  Opis rezultata...
  https://example2.com
```

## ⚠️ Pomembno

- **API ključ** je že nastavljen: `AIzaSyBuXSaDaxaIGtp0unxdBzKI_F08O3iuO0A`
- **Manjka samo** CSE ID (Search Engine ID)
- **Brez CSE ID** bo sistem uporabljal placeholder rezultate
- **Z CSE ID** bo sistem iskal po resničnem Google-u

## 🔗 Koristne povezave

- **Programmable Search Engine:** https://programmablesearchengine.google.com/ <mcreference link="https://developers.google.com/custom-search/v1/introduction" index="1">1</mcreference>
- **API Console:** https://console.developers.google.com/
- **CSE ID lokacija:** Overview > Basic section <mcreference link="https://support.google.com/programmable-search/answer/12499034?hl=en" index="2">2</mcreference>

## 🧪 Test

Po nastavitvi testiraj z:
```
"Kaj je fotosinteza?"
"Vremenska napoved Ljubljana"
"Najnovice Slovenija"
```