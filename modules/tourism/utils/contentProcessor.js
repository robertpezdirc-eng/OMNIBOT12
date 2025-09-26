/**
 * 📝 CONTENT PROCESSOR - HTML/MARKDOWN PODPORA
 * Ultra Full Feature Set za bogato urejanje besedila in vsebine
 */

const fs = require('fs').promises;
const path = require('path');

class ContentProcessor {
    constructor() {
        this.allowedHtmlTags = this.initializeAllowedTags();
        this.markdownRules = this.initializeMarkdownRules();
        this.contentTemplates = this.initializeContentTemplates();
        this.sanitizationRules = this.initializeSanitizationRules();
    }

    /**
     * 🏷️ INICIALIZACIJA DOVOLJENIH HTML ZNAČK
     */
    initializeAllowedTags() {
        return {
            // OSNOVNE ZNAČKE
            basic: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div'],
            
            // NASLOVI
            headings: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            
            // SEZNAMI
            lists: ['ul', 'ol', 'li'],
            
            // POVEZAVE IN MEDIJI
            media: ['a', 'img', 'video', 'audio', 'iframe'],
            
            // TABELE
            tables: ['table', 'thead', 'tbody', 'tr', 'th', 'td'],
            
            // CITATI IN KODA
            quotes: ['blockquote', 'cite', 'code', 'pre'],
            
            // RAZDELKI
            sections: ['section', 'article', 'aside', 'header', 'footer', 'nav'],
            
            // INTERAKTIVNI ELEMENTI
            interactive: ['button', 'details', 'summary'],
            
            // STILIZIRANJE
            styling: ['mark', 'small', 'sub', 'sup', 'del', 'ins']
        };
    }

    /**
     * 📋 INICIALIZACIJA MARKDOWN PRAVIL
     */
    initializeMarkdownRules() {
        return {
            // NASLOVI
            headings: {
                h1: /^# (.+)$/gm,
                h2: /^## (.+)$/gm,
                h3: /^### (.+)$/gm,
                h4: /^#### (.+)$/gm,
                h5: /^##### (.+)$/gm,
                h6: /^###### (.+)$/gm
            },
            
            // POUDARKI
            emphasis: {
                bold: /\*\*(.+?)\*\*/g,
                italic: /\*(.+?)\*/g,
                strikethrough: /~~(.+?)~~/g,
                underline: /__(.+?)__/g
            },
            
            // POVEZAVE
            links: {
                link: /\[(.+?)\]\((.+?)\)/g,
                autolink: /(https?:\/\/[^\s]+)/g,
                email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
            },
            
            // SEZNAMI
            lists: {
                unordered: /^[\s]*[-*+] (.+)$/gm,
                ordered: /^[\s]*\d+\. (.+)$/gm
            },
            
            // CITATI IN KODA
            quotes: {
                blockquote: /^> (.+)$/gm,
                inlineCode: /`(.+?)`/g,
                codeBlock: /```(\w+)?\n([\s\S]*?)```/g
            },
            
            // TABELE
            tables: /^\|(.+)\|\s*\n\|[-\s|:]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm,
            
            // HORIZONTALNE ČRTE
            hr: /^---+$/gm,
            
            // PRELOMI VRSTIC
            lineBreaks: /  \n/g
        };
    }

    /**
     * 📄 INICIALIZACIJA PREDLOG VSEBINE
     */
    initializeContentTemplates() {
        return {
            hotel: {
                sections: [
                    'Dobrodošli',
                    'Nastanitev',
                    'Storitve in Ugodnosti',
                    'Lokacija',
                    'Aktivnosti v Bližini',
                    'Kontakt'
                ],
                template: `
# Dobrodošli v [NAZIV_HOTELA]

## O nas
[KRATEK_OPIS_HOTELA]

## Nastanitev
### Sobe in Apartmaji
- **Standardne sobe**: [OPIS]
- **Deluxe sobe**: [OPIS]
- **Apartmaji**: [OPIS]

## Storitve in Ugodnosti
- ✅ Brezplačen WiFi
- ✅ Zajtrk vključen
- ✅ Parkiranje
- ✅ Wellness center
- ✅ Restavracija

## Lokacija
[OPIS_LOKACIJE]

### Bližnje atrakcije
- [ATRAKCIJA_1] - [RAZDALJA]
- [ATRAKCIJA_2] - [RAZDALJA]

## Rezervacije
📞 **Telefon**: [TELEFON]
📧 **E-pošta**: [EMAIL]
🌐 **Spletna stran**: [WEBSITE]
                `
            },
            
            restaurant: {
                sections: [
                    'Dobrodošli',
                    'Naša Kuhinja',
                    'Meni',
                    'Ambient',
                    'Rezervacije'
                ],
                template: `
# [NAZIV_RESTAVRACIJE]

## Naša zgodba
[OPIS_RESTAVRACIJE]

## Kulinarična izkušnja
### Specialitete
- **Tradicionalne jedi**: [OPIS]
- **Sezonski meni**: [OPIS]
- **Vegetarijanske možnosti**: [OPIS]

## Delovni čas
| Dan | Ure |
|-----|-----|
| Ponedeljek - Petek | 12:00 - 22:00 |
| Sobota - Nedelja | 11:00 - 23:00 |

## Rezervacije
> **Priporočamo rezervacijo**, posebej za večje skupine.

📞 **Rezervacije**: [TELEFON]
                `
            },
            
            spa: {
                sections: [
                    'Dobrodošli',
                    'Wellness Programi',
                    'Masaže',
                    'Savne',
                    'Cenik'
                ],
                template: `
# [NAZIV_SPA]

## Wellness oaza
[OPIS_SPA]

## Naši programi
### Masaže
- **Klasična masaža** - [CENA]
- **Aromaterapijska masaža** - [CENA]
- **Hot stone masaža** - [CENA]

### Savne
- 🔥 **Finska savna** - [TEMPERATURA]
- 💨 **Parna savna** - [VLAŽNOST]
- ❄️ **Infrardečа savna** - [OPIS]

## Rezervacije
**Obvezna predhodna rezervacija**
                `
            }
        };
    }

    /**
     * 🛡️ INICIALIZACIJA SANITIZACIJSKIH PRAVIL
     */
    initializeSanitizationRules() {
        return {
            // PREPOVEDANE ZNAČKE
            forbiddenTags: ['script', 'style', 'object', 'embed', 'form', 'input', 'textarea', 'select'],
            
            // PREPOVEDANI ATRIBUTI
            forbiddenAttributes: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
            
            // DOVOLJENI PROTOKOLI ZA POVEZAVE
            allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:'],
            
            // MAKSIMALNE DOLŽINE
            maxLengths: {
                title: 200,
                description: 5000,
                content: 50000
            }
        };
    }

    /**
     * 📝 PRETVORI MARKDOWN V HTML
     */
    markdownToHtml(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }

        let html = markdown;

        try {
            // NASLOVI
            Object.entries(this.markdownRules.headings).forEach(([tag, regex]) => {
                html = html.replace(regex, `<${tag}>$1</${tag}>`);
            });

            // POUDARKI
            html = html.replace(this.markdownRules.emphasis.bold, '<strong>$1</strong>');
            html = html.replace(this.markdownRules.emphasis.italic, '<em>$1</em>');
            html = html.replace(this.markdownRules.emphasis.strikethrough, '<del>$1</del>');
            html = html.replace(this.markdownRules.emphasis.underline, '<u>$1</u>');

            // POVEZAVE
            html = html.replace(this.markdownRules.links.link, '<a href="$2" target="_blank" rel="noopener">$1</a>');
            html = html.replace(this.markdownRules.links.autolink, '<a href="$1" target="_blank" rel="noopener">$1</a>');
            html = html.replace(this.markdownRules.links.email, '<a href="mailto:$1">$1</a>');

            // CITATI
            html = html.replace(this.markdownRules.quotes.blockquote, '<blockquote>$1</blockquote>');
            html = html.replace(this.markdownRules.quotes.inlineCode, '<code>$1</code>');

            // KODNI BLOKI
            html = html.replace(this.markdownRules.quotes.codeBlock, (match, lang, code) => {
                const language = lang ? ` class="language-${lang}"` : '';
                return `<pre><code${language}>${this.escapeHtml(code.trim())}</code></pre>`;
            });

            // SEZNAMI
            html = this.processLists(html);

            // TABELE
            html = this.processTables(html);

            // HORIZONTALNE ČRTE
            html = html.replace(this.markdownRules.hr, '<hr>');

            // PRELOMI VRSTIC
            html = html.replace(this.markdownRules.lineBreaks, '<br>');

            // ODSTAVKI
            html = this.processParagraphs(html);

            return html;

        } catch (error) {
            console.error('Napaka pri pretvorbi Markdown v HTML:', error);
            return this.escapeHtml(markdown);
        }
    }

    /**
     * 📋 OBDELAJ SEZNAME
     */
    processLists(html) {
        // Neurejen seznam
        html = html.replace(/^((?:[\s]*[-*+] .+\n?)+)/gm, (match) => {
            const items = match.trim().split('\n').map(line => {
                const itemMatch = line.match(/^[\s]*[-*+] (.+)$/);
                return itemMatch ? `<li>${itemMatch[1]}</li>` : '';
            }).filter(item => item);
            return `<ul>\n${items.join('\n')}\n</ul>`;
        });

        // Urejen seznam
        html = html.replace(/^((?:[\s]*\d+\. .+\n?)+)/gm, (match) => {
            const items = match.trim().split('\n').map(line => {
                const itemMatch = line.match(/^[\s]*\d+\. (.+)$/);
                return itemMatch ? `<li>${itemMatch[1]}</li>` : '';
            }).filter(item => item);
            return `<ol>\n${items.join('\n')}\n</ol>`;
        });

        return html;
    }

    /**
     * 📊 OBDELAJ TABELE
     */
    processTables(html) {
        return html.replace(this.markdownRules.tables, (match, header, rows) => {
            const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell);
            const headerRow = `<tr>${headerCells.map(cell => `<th>${cell}</th>`).join('')}</tr>`;

            const bodyRows = rows.trim().split('\n').map(row => {
                const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
                return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
            }).join('\n');

            return `<table>\n<thead>\n${headerRow}\n</thead>\n<tbody>\n${bodyRows}\n</tbody>\n</table>`;
        });
    }

    /**
     * 📄 OBDELAJ ODSTAVKE
     */
    processParagraphs(html) {
        const lines = html.split('\n');
        const processed = [];
        let inParagraph = false;
        let paragraphContent = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Preveri, če je vrstica HTML značka
            if (trimmedLine.match(/^<(h[1-6]|ul|ol|table|blockquote|pre|hr)/)) {
                if (inParagraph && paragraphContent.trim()) {
                    processed.push(`<p>${paragraphContent.trim()}</p>`);
                    paragraphContent = '';
                    inParagraph = false;
                }
                processed.push(line);
            } else if (trimmedLine === '') {
                if (inParagraph && paragraphContent.trim()) {
                    processed.push(`<p>${paragraphContent.trim()}</p>`);
                    paragraphContent = '';
                    inParagraph = false;
                }
            } else {
                if (!inParagraph) {
                    inParagraph = true;
                    paragraphContent = trimmedLine;
                } else {
                    paragraphContent += ' ' + trimmedLine;
                }
            }
        }

        if (inParagraph && paragraphContent.trim()) {
            processed.push(`<p>${paragraphContent.trim()}</p>`);
        }

        return processed.join('\n');
    }

    /**
     * 🔄 PRETVORI HTML V MARKDOWN
     */
    htmlToMarkdown(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        let markdown = html;

        try {
            // NASLOVI
            markdown = markdown.replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (match, level, content) => {
                return '#'.repeat(parseInt(level)) + ' ' + content;
            });

            // POUDARKI
            markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
            markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**');
            markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
            markdown = markdown.replace(/<i>(.*?)<\/i>/g, '*$1*');
            markdown = markdown.replace(/<u>(.*?)<\/u>/g, '__$1__');
            markdown = markdown.replace(/<del>(.*?)<\/del>/g, '~~$1~~');

            // POVEZAVE
            markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

            // CITATI IN KODA
            markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1');
            markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');
            markdown = markdown.replace(/<pre><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```');

            // SEZNAMI
            markdown = markdown.replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
                return content.replace(/<li>(.*?)<\/li>/g, '- $1').trim();
            });
            markdown = markdown.replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
                let counter = 1;
                return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1`).trim();
            });

            // HORIZONTALNE ČRTE
            markdown = markdown.replace(/<hr\s*\/?>/g, '---');

            // PRELOMI VRSTIC
            markdown = markdown.replace(/<br\s*\/?>/g, '  \n');

            // ODSTAVKI
            markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n\n');

            // ODSTRANI OSTALE HTML ZNAČKE
            markdown = markdown.replace(/<[^>]*>/g, '');

            // POČISTI PRESLEDKE
            markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

            return markdown;

        } catch (error) {
            console.error('Napaka pri pretvorbi HTML v Markdown:', error);
            return this.stripHtml(html);
        }
    }

    /**
     * 🛡️ SANITIZIRAJ HTML
     */
    sanitizeHtml(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        let sanitized = html;

        try {
            // ODSTRANI PREPOVEDANE ZNAČKE
            this.sanitizationRules.forbiddenTags.forEach(tag => {
                const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gis');
                sanitized = sanitized.replace(regex, '');
                const selfClosingRegex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
                sanitized = sanitized.replace(selfClosingRegex, '');
            });

            // ODSTRANI PREPOVEDANE ATRIBUTE
            this.sanitizationRules.forbiddenAttributes.forEach(attr => {
                const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
                sanitized = sanitized.replace(regex, '');
            });

            // PREVERI PROTOKOLE V POVEZAVAH
            sanitized = sanitized.replace(/href\s*=\s*["']([^"']*)["']/gi, (match, url) => {
                const protocol = url.split(':')[0].toLowerCase() + ':';
                if (this.sanitizationRules.allowedProtocols.includes(protocol)) {
                    return match;
                }
                return 'href="#"';
            });

            // OMEJI DOLŽINO
            if (sanitized.length > this.sanitizationRules.maxLengths.content) {
                sanitized = sanitized.substring(0, this.sanitizationRules.maxLengths.content) + '...';
            }

            return sanitized;

        } catch (error) {
            console.error('Napaka pri sanitizaciji HTML:', error);
            return this.escapeHtml(html);
        }
    }

    /**
     * 🔒 POBEGNI HTML ZNAKE
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 🧹 ODSTRANI HTML ZNAČKE
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    /**
     * 📄 GENERIRAJ PREDLOGO VSEBINE
     */
    generateContentTemplate(objectType, objectData = {}) {
        const template = this.contentTemplates[objectType];
        if (!template) {
            return this.contentTemplates.hotel.template; // Privzeta predloga
        }

        let content = template.template;

        // Zamenjaj placeholderje z dejanskimi podatki
        Object.entries(objectData).forEach(([key, value]) => {
            const placeholder = `[${key.toUpperCase()}]`;
            content = content.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
        });

        return content;
    }

    /**
     * 📊 ANALIZIRAJ VSEBINO
     */
    analyzeContent(content) {
        const analysis = {
            wordCount: 0,
            characterCount: 0,
            paragraphCount: 0,
            headingCount: 0,
            linkCount: 0,
            imageCount: 0,
            readingTime: 0,
            seoScore: 0,
            suggestions: []
        };

        try {
            const plainText = this.stripHtml(content);
            
            // OSNOVNA STATISTIKA
            analysis.characterCount = plainText.length;
            analysis.wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
            analysis.paragraphCount = (content.match(/<p>/g) || []).length;
            analysis.headingCount = (content.match(/<h[1-6]>/g) || []).length;
            analysis.linkCount = (content.match(/<a[^>]*>/g) || []).length;
            analysis.imageCount = (content.match(/<img[^>]*>/g) || []).length;
            
            // ČAS BRANJA (povprečno 200 besed na minuto)
            analysis.readingTime = Math.ceil(analysis.wordCount / 200);

            // SEO OCENA
            analysis.seoScore = this.calculateSeoScore(content, analysis);

            // PREDLOGI ZA IZBOLJŠANJE
            analysis.suggestions = this.generateContentSuggestions(content, analysis);

            return analysis;

        } catch (error) {
            console.error('Napaka pri analizi vsebine:', error);
            return analysis;
        }
    }

    /**
     * 📈 IZRAČUNAJ SEO OCENO
     */
    calculateSeoScore(content, analysis) {
        let score = 0;

        // DOLŽINA VSEBINE
        if (analysis.wordCount >= 300) score += 20;
        else if (analysis.wordCount >= 150) score += 10;

        // NASLOVI
        if (analysis.headingCount >= 2) score += 15;
        else if (analysis.headingCount >= 1) score += 10;

        // ODSTAVKI
        if (analysis.paragraphCount >= 3) score += 15;
        else if (analysis.paragraphCount >= 2) score += 10;

        // POVEZAVE
        if (analysis.linkCount >= 2) score += 10;
        else if (analysis.linkCount >= 1) score += 5;

        // SLIKE
        if (analysis.imageCount >= 1) score += 10;

        // STRUKTURA
        if (content.includes('<h1>')) score += 10;
        if (content.includes('<ul>') || content.includes('<ol>')) score += 10;

        // BERLJIVOST
        const avgWordsPerParagraph = analysis.paragraphCount > 0 ? analysis.wordCount / analysis.paragraphCount : 0;
        if (avgWordsPerParagraph <= 50 && avgWordsPerParagraph >= 20) score += 10;

        return Math.min(score, 100);
    }

    /**
     * 💡 GENERIRAJ PREDLOGE ZA VSEBINO
     */
    generateContentSuggestions(content, analysis) {
        const suggestions = [];

        if (analysis.wordCount < 150) {
            suggestions.push('Dodajte več vsebine - priporočamo vsaj 150 besed');
        }

        if (analysis.headingCount === 0) {
            suggestions.push('Dodajte naslove za boljšo strukturo vsebine');
        }

        if (analysis.paragraphCount < 2) {
            suggestions.push('Razdelite vsebino v več odstavkov za boljšo berljivost');
        }

        if (analysis.linkCount === 0) {
            suggestions.push('Dodajte povezave na relevantne strani ali vire');
        }

        if (analysis.imageCount === 0) {
            suggestions.push('Dodajte slike za vizualno privlačnost');
        }

        if (!content.includes('<ul>') && !content.includes('<ol>')) {
            suggestions.push('Uporabite sezname za boljšo organizacijo informacij');
        }

        return suggestions;
    }

    /**
     * 💾 SHRANI VSEBINO
     */
    async saveContent(objectId, contentType, content, metadata = {}) {
        try {
            const contentDir = path.join(__dirname, '../data/content');
            await fs.mkdir(contentDir, { recursive: true });

            const contentData = {
                objectId,
                contentType,
                content: {
                    raw: content,
                    html: this.markdownToHtml(content),
                    markdown: this.htmlToMarkdown(content),
                    sanitized: this.sanitizeHtml(content)
                },
                metadata: {
                    ...metadata,
                    analysis: this.analyzeContent(content),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };

            const filePath = path.join(contentDir, `${objectId}_${contentType}.json`);
            await fs.writeFile(filePath, JSON.stringify(contentData, null, 2));

            return contentData;

        } catch (error) {
            console.error('Napaka pri shranjevanju vsebine:', error);
            throw error;
        }
    }

    /**
     * 📖 NALOŽI VSEBINO
     */
    async loadContent(objectId, contentType) {
        try {
            const filePath = path.join(__dirname, '../data/content', `${objectId}_${contentType}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Napaka pri nalaganju vsebine:', error);
            return null;
        }
    }
}

module.exports = ContentProcessor;