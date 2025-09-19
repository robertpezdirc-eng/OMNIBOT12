# OmniAI

This is a self-healing, omniscient AI application featuring a real-time AI assistant, interactive maps, and an application search engine, all accessible from a single-page interface.

## Navodila za zagon

### 1. Namestitev
Najprej namestite vse potrebne Node.js pakete. V glavni mapi projekta zaženite:
```bash
npm install
```
Ta ukaz bo namestil `express`, `@google/genai` in druge odvisnosti, definirane v `package.json`. Prav tako bo namestil `nodemon`, ki je potreben za samodejni ponovni zagon strežnika.

### 2. Nastavitev API Ključa
Aplikacija za delovanje potrebuje veljaven Google AI API ključ. Nastavite ga kot okoljsko spremenljivko.

**Na macOS/Linux:**
```bash
export API_KEY="VAŠ_API_KLJUČ"
```

**Na Windows (Command Prompt):**
```bash
set API_KEY="VAŠ_API_KLJUČ"
```

**Na Windows (PowerShell):**
```bash
$env:API_KEY="VAŠ_API_KLJUČ"
```
**Pomembno:** Zamenjajte `"VAŠ_API_KLJUČ"` s svojim dejanskim Google AI API ključem.

### 3. Zagon Aplikacije
Ko ste namestili pakete in nastavili API ključ, zaženite backend strežnik:
```bash
npm start
```
Strežnik se bo zagnal na `http://localhost:5000` in se bo samodejno ponovno zagnal ob vsaki spremembi v `server.js`, zahvaljujoč `nodemon`.

### 4. Uporaba
Ko strežnik teče, v svojem spletnem brskalniku odprite naslov:
```
http://localhost:5000
```

## Funkcionalnosti

- **AI Asistent:** Interaktiven klepet z AI, ki podpira sprotno generiranje odgovorov (streaming) in Markdown formatiranje.
- **Kopiranje Kode:** Vsi bloki s kodo, ki jih generira AI, imajo gumb za enostavno kopiranje v odložišče.
- **Interaktivni Zemljevid:** Zemljevid se dinamično posodablja na podlagi poizvedb, ki vključujejo lokacije.
- **Iskanje Aplikacij:** Hitro iskanje po lokalni bazi aplikacij, ki je del baze znanja.
- **Nastavitve:** Spremenite jezik in hitrost govorjenega odgovora.
- **Samo-popravljanje (Self-Healing):** V primeru napake na frontendu ali backendu bo sistem samodejno poskusil popravek s pomočjo AI in se ponovno zagnal/osvežil.

## Baza Znanja

Aplikacija uporablja centralizirano bazo znanja, ki se nahaja v mapi `knowledge/`. Ob zagonu strežnik samodejno naloži vse `.json` datoteke iz te mape.

**Kako razširiti bazo znanja:**
1. Ustvarite novo datoteko `.json` v mapi `knowledge/` (npr. `my_data.json`).
2. V datoteko dodajte svoje strukturirane podatke.
3. Ponovno zaženite strežnik. AI bo zdaj imel dostop do vaših novih podatkov in jih bo lahko uporabil pri odgovarjanju na vprašanja.