# Vangst & Vlees van Dijk — Bestelsysteem

## Wat is dit
Web-based bestel- en factureringssysteem voor een kleine viswinkel/slager. Klanten bestellen wekelijks via een gedeelde link, de beheerder verwerkt bestellingen, print facturen en werkt gewichten bij op basis van leveranciersfacturen.

## Stack
- **Hosting:** Google Apps Script (script.google.com)
- **Opslag:** PropertiesService (server-side JSON blobs)
- **Frontend:** Enkele `index.html` — vanilla JS, geen frameworks
- **Backend:** `Code.gs` — Apps Script functies aangeroepen via `google.script.run`
- **Libraries:** JSZip (voor .docx parsing), pdf.js (voor pakbon PDF's)

## Bestanden
```
Code.gs       — Server-side: doGet, getAllData, saveProducts, addOrder, updateOrder, saveOrders, saveSettings, deleteOrders, stuurFactuurMail, verstuurBestellingenMail
index.html    — Volledige frontend + script (~1450 regels)
```

## Live URL
- Deployment ID eindigt op `03iewb`
- URL: `https://script.google.com/macros/s/AKfycbykqis1cB4I6wDI7jJ7GY_M-Bol2QTVdSH0YL0VeHlaA3IXagfw-u-k3ebKpq03iewb/exec`
- Klanten hebben deze link — nooit veranderen bij deployen, altijd via "New version" op dezelfde deployment.

## Admin
- Wachtwoord: `VleesenVis26@`
- Beheerder e-mail: loekvandijk@gmail.com

## Datamodel
```
productsData = { products: [{artikel, omschrijving, prijs, categorie}], weekLabel: "Week 17" }
orders = [{id, naam, tel, email, week, datum, tijd, notitie, items:[{artikel, omschrijving, prijs, qty, categorie, gewicht}], totaal}]
settings = { gesloten: bool, emailAdressen: [] }
```

## Categorieën
`VIS`, `VLEES`, `BROOD`, `DIVERSEN`, `AGF` — plus `FAV` (client-side favorieten via localStorage)

## Cruciale werkwijze bij updates

### Optie A — handmatig via Apps Script editor
1. Bewerk `index.html` en/of `Code.gs` in Apps Script editor
2. **Ctrl+S** opslaan
3. **Deploy → Manage deployments** → potloodje ✏️ bij deployment met `03iewb` in URL → **New version** → **Deploy**
4. URL blijft hetzelfde, klanten hoeven geen nieuwe link
5. Test in de webapp met **Ctrl+Shift+R** (harde refresh)

### Optie B — via clasp (Google's Apps Script CLI), lokaal op je eigen machine
Deze repo bevat `.clasp.json`, `.claspignore` en `appsscript.json` als voorbereiding. Claude Code kan hier niet automatisch mee deployen omdat dat een Google-login vereist — dit moet je zelf eenmalig doen:

1. `npm install` (installeert clasp lokaal als devDependency)
2. `npx clasp login` — eenmalig inloggen met je Google-account in de browser
3. Vul in `.clasp.json` je echte `scriptId` in (te vinden in Apps Script via **Project-instellingen** ⚙️, of gebruik `npx clasp clone <scriptId>` om het project te linken)
4. `npx clasp push` — stuurt `index.html`, `Code.gs` en `appsscript.json` naar Apps Script (overschrijft de editor-inhoud, dus commit eerst je Git-wijzigingen)
5. `npx clasp deployments` — zoek de deployment waarvan de webapp-URL eindigt op `03iewb` en noteer het `Deployment ID`
6. `npx clasp deploy -i <Deployment ID> -d "beschrijving"` — update die specifieke deployment zonder de klant-URL te veranderen

Let op: `clasp push` overschrijft alles in de Apps Script editor met de lokale bestanden. Zorg dat `index.html`/`Code.gs` in Git altijd de bron van waarheid zijn voordat je pusht.

## Bekende valkuilen

### Meerdere deployments
Er zijn meerdere deployments in Apps Script (Vangst en Vlees, Untitled, Archived). ALLEEN de deployment met `03iewb` in de URL is de live versie voor klanten. Overige zijn oude test-deployments.

### Apps Script iframe & dynamische onclick handlers
Knoppen die via `innerHTML` gegenereerd worden verliezen soms hun `onclick` handler in het iframe. Los op door:
- Statische HTML buttons met `id`
- Event delegation via `document.addEventListener('click', ...)`
- Of vaste knoppen die je toont/verbergt via `display`

Zie `bestel-btn-fixed` in `#tab-mijnlijst` als voorbeeld.

### Null orders
Als `addOrder` crashed halverwege blijven er null entries in `orders`. ALTIJD `.filter(Boolean)` gebruiken bij iteraties, en `if(!o||!o.naam)return` in forEach loops. Anders crashen `renderCart`, `renderAdminOrders`, `buildAgg`, `plaatsOrder`.

### google.script.run parameters
Complexe objecten met geneste arrays kunnen kapot gaan bij doorgeven. Als er problemen zijn: `JSON.stringify(order)` versturen en in `Code.gs` parsen. Maar dit brak eerder `updateOrder` en `saveOrders` — dus alleen als laatste redmiddel.

### MailApp in webapp context
`MailApp.sendEmail` werkt vanuit een testfunctie in de editor prima, maar vanuit `google.script.run` kan het stiller falen. ALTIJD in aparte try-catch dan het opslaan, zodat mail-fouten het opslaan niet blokkeren. Executions log toont "No logs available" bij webapp calls ook als de code wel draaide.

### Kopiëren via Windows Kladblok
Windows Notepad kapt grote HTML af bij copy/paste in Apps Script. Als `Ctrl+F` naar een string zoekt en die niet vindt terwijl je zeker weet dat het in het bestand staat, is het waarschijnlijk afgekapt. Oplossing: gebruik Notepad++ of VS Code, of plak in kleinere delen.

### Word parser
Detecteert automatisch aantal kolommen via de header rij (Artikel/Omschrijving/eventueel Merk/Verpakking/Prijs). Werkt met zowel 3-kolom formaten (nieuwe zusje-lijsten) als 5-kolom formaten (oude lijsten). Herkent styles `Kop1`/`Kop2`/`Heading1`/`Heading2` voor categorieën.

### PDF pakbon parser
Leest klantnaam achter "JULIA VAN DIJK - " bovenaan. Matched producten op artikelnummer + past `item.gewicht` aan (niet `item.qty`). Prijs blijft ongewijzigd (dat is jouw commissieprijs, niet leveranciersprijs). Producten met "stuk" of "1.000/s" in NETTO kolom worden overgeslagen.

## Features & conventions

### Geportioneerde producten
Producten waarvan `omschrijving` "geport" bevat krijgen:
- Geel "Prijs per kg" label
- Gewichtsveld naast +/− knoppen
- Prijsberekening: `p.prijs × gewicht` in plaats van `p.prijs × qty`

### Bestelling wijzigen
Als naam + telefoon + week overeenkomen met bestaande bestelling → wordt overschreven i.p.v. dubbel opgeslagen. Wordt in `plaatsOrder` afgevangen via `bestaandeIdx` check.

### Sessie
Naam, telefoon, e-mail worden opgeslagen in `sessionStorage` per browser. Andere apparaten/browsers zien lege velden. Favorieten in `localStorage`.

### Bestelperiode
Wanneer `settings.gesloten=true`:
- Klanten zien "Bestellen is gesloten" banner
- Kunnen niet bestellen
- Beheerder kan mail naar alle beheerders sturen met totaaloverzicht

### Factuur
- Bewerkbaar grid met prijs + qty/gewicht per regel
- Printvriendelijke sectie (`#printable`) met `@media print` CSS
- Klantpicker + edit-controls worden verborgen bij afdrukken
- Regels kunnen verwijderd worden (× knop)
- Nieuwe producten toevoegen via dropdown

### Bestelhistorie
Klanten zien laatste 5 eigen bestellingen (matched op naam+telefoon in sessionStorage) met "Opnieuw bestellen" knop die het mandje vult.

## Code style
- Vanilla JS (geen ES6 arrow functions in production — Apps Script iframe kan `const`/arrow problemen geven)
- `var` overal
- Nederlandse variabelenamen waar logisch (`naam`, `tel`, `week`)
- Korte functies, geen abstracties zonder reden
- Null-safe by default: `.filter(Boolean)`, `if(!x||!x.property)return`

## Toekomstige features (geplande volgorde)
1. ~~PDF pakbon upload~~ ✅
2. ~~Bestelhistorie klanten~~ ✅
3. ~~Favorieten met ster~~ ✅
4. ~~Factuur aanpassen (verwijderen/toevoegen)~~ ✅
5. Tikkie-link genereren bij factuur
6. Notificatie via Pushover/Telegram bij nieuwe bestelling
7. Wekelijkse export naar Google Sheets
