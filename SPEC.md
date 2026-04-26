# Spelklar — Systemspecifikation

> Version: 2026-04-26
> Repo: github.com/rahmla/spelklar
> Live: Vercel (spelklar-*.vercel.app)
> Backend: Supabase (evwwguiryacnclcvlnwn.supabase.co, region: Stockholm)

---

## 1. Syfte och målgrupp

Spelklar är en mobil-first webb-app för idrottsgymnasier (NIU och RIG). Den ger elever och tränare ett gemensamt verktyg för att följa upp atleternas dagliga mående, planera träning och hantera skador.

**Primära användare**
- Elever — checkar in varje morgon, loggar pass, anmäler skador, sätter mål
- Tränare / lärare — ser elevernas mående, planerar träningsveckan, följer trender och risker

**Sekundärt**
- Admin — samma behörighet som tränare
- Stöd för flera skolor i samma installation (multi-tenant via `school_id`)

---

## 2. Teknisk stack

| Lager | Teknik |
|---|---|
| Frontend | React 19 + TypeScript 6 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Byggverktyg | Vite 8 |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Hosting | Vercel (auto-deploy från GitHub `main`) |
| Routing | Tillståndsstyrd (ingen router-lib, tab-state i App.tsx) |
| Autentisering | Supabase Auth — e-post + lösenord |

---

## 3. Arkitektur

```
src/
├── App.tsx                  # Root — auth-gating, tab-routing, header
├── main.tsx
├── index.css
├── lib/
│   └── supabase.ts          # Supabase-klient (env-vars)
├── hooks/
│   └── useAuth.ts           # Auth-hook: session, profil, signIn/Out/Up
├── types/
│   └── index.ts             # Alla delade typer + getReadinessColor()
├── components/
│   └── BottomNav.tsx        # Bottennavigering, student (5 flikar) / coach (3 flikar)
└── pages/
    ├── LoginPage.tsx        # Inloggningsformulär
    ├── StudentHome.tsx      # Elevens startsida
    ├── CheckInPage.tsx      # Daglig morgon-check-in
    ├── SchedulePage.tsx     # Schema (läs + tränare kan lägga till)
    ├── LogPage.tsx          # Loggöversikt: passlogg + skador
    ├── TrainingLoadPage.tsx # Logga ett pass (RPE × tid)
    ├── InjuryPage.tsx       # Anmäl skada / känning
    ├── ProfilePage.tsx      # Elevprofil: statistik, historik, mål
    ├── CoachDashboard.tsx   # Tränarvy: alla elever + trender
    └── CoachPlanPage.tsx    # Tränarens veckoplanering
```

### Navigationsflöde

**Elever** (5 flikar i bottennavigeringen):

```
Hem → Check-in → Schema → Logg → Profil
                            ↓
                      [Logga pass]
                      [Anmäl skada]
```

**Tränare** (3 flikar):

```
Elever → Schema → Plan
```

Tab-state hanteras i `App.tsx` med `useState`. Sub-vyer (t.ex. `load`, `injury`) är extra tillstånd utanför BottomNav.

---

## 4. Databas (Supabase / PostgreSQL)

### 4.1 Tabeller

#### `schools`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| name | text | Skolans namn |
| type | text | `NIU` eller `RIG` |
| sport | text | Primär idrott |
| city | text | |
| created_at | timestamptz | |

#### `profiles`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | Matchar `auth.users.id` |
| school_id | uuid FK → schools | Multi-tenant nyckel |
| full_name | text | |
| role | text | `student`, `coach`, `teacher`, `admin` |
| sport | text | Valfri |
| year | int | Årskurs 1–3 |
| created_at | timestamptz | |

#### `checkins`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| date | date | YYYY-MM-DD (unik per user+dag via upsert) |
| sleep_quality | int | 1–5 |
| tiredness | int | 1–5 |
| stress | int | 1–5 |
| body_soreness | int | 1–5 |
| motivation | int | 1–5 |
| has_injury | boolean | |
| ate_breakfast | boolean | |
| ready_to_train | boolean | |
| notes | text | Valfri fritext |
| created_at | timestamptz | |

#### `injuries`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| body_part | text | Fri text (t.ex. "Knä", "Axel") |
| pain_level | int | 1–10 |
| started_at | date | |
| worsening | boolean | |
| affects_training | boolean | |
| notes | text | Valfri |
| resolved_at | date | null = aktiv skada |
| created_at | timestamptz | |

#### `schedule_items`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| school_id | uuid FK → schools | |
| title | text | |
| type | text | `training`, `school`, `match`, `gym`, `recovery`, `travel`, `test`, `meeting` |
| date | date | |
| start_time | time | |
| end_time | time | Valfri |
| location | text | Valfri |
| notes | text | Valfri |
| created_by | uuid FK → profiles | Valfri |
| created_at | timestamptz | |

#### `training_load`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| date | date | |
| session_title | text | Valfri |
| duration_minutes | int | |
| rpe | int | 1–10 (Rate of Perceived Exertion) |
| notes | text | Valfri |
| created_at | timestamptz | |

> Belastningspoäng = `rpe × duration_minutes`

#### `goals`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| school_id | uuid FK → schools | |
| title | text | |
| type | text | `week`, `month`, `term`, `technical`, `physical`, `mental`, `school` |
| target_date | date | Valfri |
| completed_at | timestamptz | null = aktivt mål |
| created_at | timestamptz | |

#### `training_plans`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| school_id | uuid FK → schools | |
| coach_id | uuid FK → profiles | |
| week_start | date | Alltid en måndag |
| title | text | Auto-genererat om tomt |
| focus | text | Veckans övergripande fokus |
| created_at | timestamptz | |

#### `plan_sessions`
| Kolumn | Typ | Notering |
|---|---|---|
| id | uuid PK | |
| plan_id | uuid FK → training_plans (cascade) | |
| day_of_week | int | 1=måndag … 7=söndag |
| title | text | |
| type | text | `training`, `technique`, `physical`, `gym`, `match`, `recovery`, `rehab` |
| start_time | time | Valfri |
| duration_minutes | int | Valfri |
| intensity | text | `low`, `medium`, `high` |
| description | text | Valfri |
| focus_cue | text | Kort fokus-signal (t.ex. "Snabb armsving") |

> När ett pass läggs till i en träningsplan skapas automatiskt ett `schedule_item` för samma datum, så att eleverna ser passet i sitt schema.

---

### 4.2 Row Level Security (RLS)

Alla tabeller har RLS aktiverat. Åtkomst styrs av security definer-funktioner för att undvika rekursion:

```sql
-- Hämtar inloggad användares school_id
get_my_school_id() → uuid

-- Hämtar inloggad användares roll
get_my_role() → text

-- Hämtar alla profil-id:n i samma skola
get_school_user_ids() → setof uuid

-- Hämtar alla plan-id:n för inloggad användares skola
get_my_plan_ids() → setof uuid
```

**Principerna:**
- Elever läser/skriver bara sina egna rader (`user_id = auth.uid()`)
- Tränare/lärare/admin läser data från alla elever på samma skola
- Schema och träningsplaner är läsbara för hela skolan, men bara tränare kan skriva
- Skolor är isolerade från varandra

---

## 5. Autentisering

- **Metod:** e-post + lösenord via Supabase Auth
- **Email-bekräftelse:** avstängd (för enkel onboarding av testanvändare)
- **Profil:** skapas i `profiles` vid registrering med `signUp()`, kopplad till `auth.users.id`
- **Session:** hanteras av `useAuth`-hook som lyssnar på `onAuthStateChange`
- **Inloggningsflöde:** `LoginPage → useAuth.signIn() → fetchProfile() → App renderar rätt vy`

---

## 6. Funktioner per roll

### 6.1 Elev

| Funktion | Sida | Beskrivning |
|---|---|---|
| Startsida | StudentHome | Visar dagens check-in-status, streak, nästa pass från schemat, snabblänkar till passlogg och skadeanmälan |
| Morgon-check-in | CheckInPage | 5 skalfrågor (sömn, trötthet, stress, kroppsvärk, motivation) + 3 ja/nej (skada, frukost, redo) + fritext |
| Beredskaps-färg | — | Beräknas automatiskt: grön / gul / röd baserat på poängsumma och flaggor |
| Schema | SchedulePage | Lista på kommande aktiviteter, färgkodade per typ |
| Passlogg (logg) | LogPage | Översikt: veckobelastning, aktiva skador, historik 30 dagar |
| Logga pass | TrainingLoadPage | RPE 1–10 + duration → belastningspoäng, valfri titel och kommentar |
| Anmäl skada | InjuryPage | Kroppsdel (12 alternativ), smärtnivå 1–10, förvärras?, påverkar träning?, fritext |
| Markera skada löst | LogPage | Knapp på aktiv skada → sätter `resolved_at` |
| Profil + historik | ProfilePage | 28-dagars check-in-rutnät (färgat), 7-dagarssnitt på alla mätvärden, streak |
| Mål | ProfilePage | CRUD: sätt mål (typ + datum), bocka av, ta bort. Visa uppnådda mål |

### 6.2 Tränare / Lärare / Admin

| Funktion | Sida | Beskrivning |
|---|---|---|
| Elevöversikt | CoachDashboard | Alla elever sorterade efter risk (röd → saknas → gul → grön). Sammanfattning med antal per kategori |
| Trendprickar | CoachDashboard | 7 prickar per elev visar senaste 7 dagars färg |
| Varningsfilter | CoachDashboard | Filtrera på "Alla", "Risk", "Ej incheckade", "Varning" (3 röda i rad, 3 dagars dålig sömn, m.m.) |
| Elevdetalj | CoachDashboard | Tryck på elev → expanderat kort med alla mätvärden för dagens check-in, frukost-status, eventuell kommentar |
| Automatiska varningar | CoachDashboard | Identifierar: röd 3 dagar i rad, låg sömn 3 dagar, hög trötthet 3 dagar, ingen grön dag senaste 3 dagarna, aktiv skada, 3+ missade check-ins |
| Schema | SchedulePage | Se kommande aktiviteter + lägga till (titel, typ, datum, tid, plats, anteckningar) |
| Träningsplan | CoachPlanPage | Skapa plan per vecka (veckofokus). Lägg till pass per dag (typ, intensitet, tid, duration, fokus-cue, beskrivning). Navigera bakåt/framåt i veckor |
| Auto-schema | CoachPlanPage | Pass som läggs till i träningsplanen skapar automatiskt ett `schedule_item` så elever ser det |

---

## 7. Beredskapsalgoritm (readiness score)

```typescript
score = sleep_quality + (6 - tiredness) + (6 - stress) + (6 - body_soreness) + motivation
// max = 25

if (has_injury)       → röd
if (!ate_breakfast)   → gul
if (score/25 >= 0.72) → grön
if (score/25 >= 0.48) → gul
else                  → röd
```

**Tolkning**
- Grön: eleven är redo för full träning
- Gul: lite sliten, träna men med hänsyn
- Röd: risk för skada eller överbelastning — tränaren bör följa upp

---

## 8. Miljövariabler

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<lång JWT>
```

Sätts i `.env` lokalt och i Vercel-projektets inställningar för production.

---

## 9. Driftsättning

| Miljö | URL | Trigger |
|---|---|---|
| Lokalt | http://localhost:5173 | `npm run dev` |
| Production | Vercel-domän | Push till `main` på GitHub |

Vercel detekterar Vite automatiskt. Build-kommando: `npm run build`. Output-mapp: `dist`.

---

## 10. Kända begränsningar och nästa steg

### Implementerat
- [x] Daglig morgon-check-in med beredskaps-algoritm
- [x] Tränarvy med realtidsstatus, trender och varningar
- [x] Schema (läs för alla, skriv för tränare)
- [x] Träningsplan veckovis med dagliga pass
- [x] Passlogg med RPE och belastningspoäng
- [x] Skadeanmälan med kroppsdel och smärtnivå
- [x] Profil med 28-dagars historik och mål
- [x] Multi-school-stöd via `school_id`
- [x] RLS för dataisolering

### Ej implementerat ännu
- [ ] Push-notiser / påminnelser (kräver Service Worker eller extern tjänst)
- [ ] Närvaro per träningspass
- [ ] Träningsdagbok (fritextreflexion efter pass)
- [ ] Match- och tävlingslogg
- [ ] Rehab-program med checklistor
- [ ] Veckorapport (automatisk sammanfattning)
- [ ] Kommunikation / meddelanden
- [ ] Föräldravy
- [ ] Frånvaroanmälan
- [ ] Testresultat och prestationsutveckling
- [ ] Videofeedback
- [ ] AI-sammanfattningar
- [ ] Packlistor och tävlingskalender
- [ ] Sömnlogg (separat från check-in)
- [ ] Mental träning / visualisering
- [ ] Gamification (achievements, nivåer)
- [ ] PWA / installerbar app
