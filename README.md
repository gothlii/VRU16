# VRU16 · Visby Roma

Lagets reseplanerare med inloggning, redigerbara resor och en spelarlista som räknar hur många resor varje barn är schemalagt på.

**Webbplats:** https://gothlii.github.io/VRU16/

## Automatisk publicering

Varje push till `main` kör tester och bygger versionsmärkta tillgångar från `public/` och publicerar dem till GitHub Pages via `.github/workflows/deploy.yml`. En misslyckad testkörning stoppar publiceringen. Under **Actions → Test and publish VRU16** syns status; inställningen **Settings → Pages → Source** ska vara **GitHub Actions**. Push till andra grenar publiceras inte.

## Köra lokalt

Node.js 22 eller senare krävs. Inga externa npm-paket behövs.

```sh
npm start
```

Öppna http://127.0.0.1:3000/VRU16/. Verklig Firebase-inloggning används även i lokal förhandsvisning.

```sh
npm test
```

## Funktioner

- Inloggning med lagets användarnamn och lösenord. Reseuppgifter hämtas först efter inloggning.
- Tabell med numeriskt veckonummer, datum (`ÅÅÅÅ-MM-DD`), ledare, barn och antal barn. Vecka, år och datum kan ändras separat per resa. De ursprungliga lördagsdatumen har bevarats för 2026 respektive 2027; datum räknas aldrig om när vecka eller år ändras. Målvakter och osäkra deltagare markeras.
- Spelarlista bredvid tabellen på stora skärmar och under den på mobil. Antal resor visas som en siffra och vid hovring eller tangentbordsfokus.
- **Lägg till vecka** skapar en ny resa med vecka, år, ledare, barn och anteckning. Datum väljs manuellt. Flera separata resor kan ha samma vecka och år, även samma datum. Varje resa redigeras och tas bort separat. Ledare kan fyllas i senare. **Ta bort vecka** under **Ändra** tar bort resan efter bekräftelse; barnen behålls i spelarlistan. Resorna sorteras kronologiskt när ändringar sparas.
- **Ändra** öppnar resan. Barnnamn kan skrivas med fritext och måste matcha spelarlistan. Barn kan tas bort, bytas och läggas till från listan innan ändringarna sparas.
- Nya barn kan skapas från spelarlistan eller inne i en resa. Namn kan ändras och uppdateras då på samtliga resor. Dubbletter och tomma namn avvisas.
- Antal barn och resräknare räknas om efter sparning. Även osäkra placeringar räknas som schemalagda resor.
- Samtidiga ändringar skyddas med Firestores `updateTime`: en för gammal version skriver inte över någon annans ändringar. Välj **Hämta senaste** för att uppdatera vyn.
- Utloggning rensar session och renderade reseuppgifter.

## Firebase och åtkomst

Samma projekt och databas som `gothlii/VRIsSchema` används: Firestore-projektet `vrisschema`, databasen `(default)`. VRU16 använder endast dokumentet `vru16_travel/plan`. Ingen reseinformation eller barnlista finns i webbplatsens publicerade filer eller i detta repos historik.

Firebase Authentication kontrollerar lagkontot. Webbläsaren skickar en kortlivad ID-token till Firestore. Sessionen lagras i `sessionStorage`, återställs vid omladdning av samma flik och rensas vid utloggning. Firebase sköter tokenförnyelsen via sin REST-tjänst. Sessioner i andra flikar påverkas inte av lokal utloggning.

Firestore-regler kräver lagkontots UID eller befintlig schemaadministratör för läsning och skrivning av reseplanen. Utloggad direktåtkomst till dokumentet ska ge HTTP 403. Lagkontot får inte ändra schemasidans övriga samlingar. Reglerna för befintliga schemaanvändare bevaras. Regler för projektets andra appar publiceras inte av GitHub Actions.

Lagets publika användarnamn är ett alias till ett separat Firebase Auth-konto. Appen lägger till det fasta prefixet `VRU16:` före inmatat lösenord för att uppfylla Firebase Auths krav på minst sex tecken. Kontots lösenord måste ändras med samma konvention om lagets inloggning byts. Lösenordet finns inte i koden. API-nyckeln i `public/firebase.js` är Firebase-webbappens publika projektkonfiguration; den ersätter inte autentisering eller säkerhetsregler.

Datadokumentet har `schemaVersion: 2` samt `payload`, en JSON-sträng med `children` och `trips`. Spelar-ID:n är stabila; resorna hänvisar till dem så namnändringar inte bryter kopplingarna. Appen visar ett fel om behörighet eller nätverk saknas och presenterar ingen lokal reservkopia som sparad data.

## Design och tillgänglighet

Klubbens primärfärg `#1D3160`, gult `#FFCA01` och vitt följer https://visbyroma.se/. Originalloggan har sparats lokalt från https://visbyroma.se/wp-content/uploads/2024/09/Logga-Visby-Roma-Dark-transparant-267x300.png. Mobilanpassad layout, tangentbordsfokus, tabellrubriker, formuläretiketter och statusmeddelanden ingår. Tabellen kan rullas i sidled på smala skärmar.
