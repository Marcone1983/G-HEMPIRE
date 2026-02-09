# 🔍 AUDIT COMPLETO - G-HEMPIRE TELEGRAM MINI APP

**Data:** 2026-02-09
**Stato:** NECESSARIE CORREZIONI CRITICHE
**Compliance Telegram Mini App:** ❌ NON CONFORME

---

## 🚨 PROBLEMI CRITICI (BLOCKERS)

### 1. **ARCHITETTURA INCONSISTENTE**
**Gravità:** 🔴 CRITICA

**Problema:**
- Backend Python (`server.py`, `telegram_bot.py`) usa **MongoDB**
- Database reale è **Supabase PostgreSQL**
- Edge Functions Supabase duplicano la logica ma NON sono sincronizzate
- Frontend configurato per chiamare backend Python che NON FUNZIONERÀ in production

**Impatto:**
- ❌ Applicazione completamente NON funzionante
- ❌ Dati non persistenti
- ❌ Impossibile deploy

**Soluzione:**
```
✅ RIMUOVERE backend Python completamente
✅ CONSOLIDARE tutta la logica nelle Edge Functions Supabase
✅ Aggiornare frontend per chiamare Edge Functions
```

---

### 2. **TELEGRAM BOT NON CONFIGURATO**
**Gravità:** 🔴 CRITICA

**Problemi:**
- ❌ Manca `TELEGRAM_BOT_TOKEN` nel `.env`
- ❌ `TELEGRAM_BOT_USERNAME` non configurato
- ❌ Webhook URL non impostato
- ❌ Bot non registrato su Telegram

**Impatto:**
- Impossibile aprire l'app da Telegram
- Nessuna integrazione bot funzionante
- Payments non possibili

**Soluzione:**
```bash
# Creare bot con @BotFather
1. /newbot → Nome bot → Username
2. Ottenere token
3. Configurare in Supabase bot_config table
4. Impostare webhook su edge function
```

---

### 3. **SICUREZZA INESISTENTE**
**Gravità:** 🔴 CRITICA

**Problemi:**
- ❌ Nessuna validazione Telegram WebApp `initData`
- ❌ Chiunque può creare player con wallet fake
- ❌ API completamente aperte senza auth
- ❌ RLS policies incomplete
- ❌ Secrets hardcoded nel codice

**Impatto:**
- Hackers possono manipolare dati
- Furto di rewards/coins
- Database completamente esposto

**Vulnerabilità critiche:**
```javascript
// ❌ VULNERABILE - Chiunque può chiamare
await axios.post(`${API}/player`, {
  wallet_address: "FAKE_WALLET"
});

// ❌ VULNERABILE - Nessuna validazione chi sei
await axios.post(`${API}/garden/harvest`, {
  player_id: "ANY_ID"
});
```

**Soluzione:**
```typescript
// ✅ VALIDARE initData Telegram
function validateTelegramWebAppData(initData: string): boolean {
  const { hash, ...data } = parse(initData);
  const secret = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
  const computedHash = createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');
  return computedHash === hash;
}
```

---

### 4. **TELEGRAM MINI APP REQUIREMENTS MANCANTI**
**Gravità:** 🔴 CRITICA

**Requirements Telegram per pubblicazione:**

❌ **Telegram WebApp SDK**
- Non integrato nel frontend
- Manca `window.Telegram.WebApp` initialization
- Theme parameters non implementati

❌ **InitData Validation**
- Nessuna validazione server-side
- Chiunque può impersonare utenti

❌ **Cloud Storage API**
- Non implementato (table exists ma non usata)

❌ **Telegram Stars Payments**
- Mock implementation
- Invoice creation non funzionante
- Payment validation assente

❌ **Bot Commands**
- /start implementato male
- Menu button non configurato
- Deep linking non funzionante

**Documentazione Telegram:**
https://core.telegram.org/bots/webapps

---

### 5. **PLACEHOLDER / MOCK / DEMO CODE**
**Gravità:** 🟡 ALTA

**Codice NON production-ready trovato:**

```javascript
// ❌ App.js:21-38 - DEFAULT OFFLINE PLAYER
const DEFAULT_PLAYER = {
  id: "offline",
  username: "Grower",
  coins: 1000,
  // ... MOCK DATA
};

// ❌ App.js:1338-1343 - FAKE WALLET GENERATION
if (!walletAddress && !localStorage.getItem("temp_wallet")) {
  const tempWallet = "UQ" + Math.random().toString(36); // DEMO
  localStorage.setItem("temp_wallet", tempWallet);
}

// ❌ server.py:614 - MOCK PAYMENT
# In production, this would verify Telegram Stars payment
# PLACEHOLDER CODE - NON FUNZIONA

// ❌ Seed images placeholder
"moon_rocks": { seed_image: "seed_evo_og.png" } // WRONG - using OG image
```

**Rimuovere:**
- Tutti i commenti TODO/FIXME
- Mock payment processing
- Demo wallet generation
- Placeholder images
- Offline mode
- Test data hardcoded

---

## ⚠️ PROBLEMI MAGGIORI

### 6. **FRONTEND CONFIGURATION**
**Gravità:** 🟠 MEDIA

```javascript
// ❌ App.js:16-17 - Backend URL non configurato
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // undefined!
const API = `${BACKEND_URL}/api`; // "undefined/api"
```

**Soluzione:**
```env
# .env.production
VITE_SUPABASE_URL=https://skpwsivnqjougllkllfr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GAME_API_URL=https://skpwsivnqjougllkllfr.supabase.co/functions/v1/game-api
```

---

### 7. **EDGE FUNCTIONS ISSUES**

**game-api/index.ts:**
- ❌ L.316: genera referral code random (non secure)
- ❌ L.598: Purchase gems senza validazione payment
- ❌ Manca rate limiting
- ❌ Manca error logging proper
- ❌ Nessuna validazione Telegram user

**telegram-webhook/index.ts:**
- ❌ Non esiste! Deve essere implementata
- ❌ Webhook signature validation mancante

---

### 8. **DATABASE SCHEMA ISSUES**

**Problemi:**
- ✅ RLS enabled su tutte le tables (GOOD)
- ❌ Ma policies sono incomplete/mancanti
- ❌ No indexes su query frequenti
- ❌ telegram_id dovrebbe essere primary auth method

**Missing indexes:**
```sql
CREATE INDEX idx_players_telegram_id ON players(telegram_id);
CREATE INDEX idx_players_referral_code ON players(referral_code);
CREATE INDEX idx_plots_ready_at ON plots(ready_at) WHERE is_ready = false;
```

---

## 📋 CONFORMITÀ TELEGRAM MINI APP

### Requirements Checklist:

| Requirement | Status | Priority |
|------------|--------|----------|
| Telegram WebApp SDK Integration | ❌ Missing | 🔴 Critical |
| InitData Validation Server-Side | ❌ Missing | 🔴 Critical |
| Bot Token Configuration | ❌ Missing | 🔴 Critical |
| Webhook Setup | ❌ Missing | 🔴 Critical |
| HTTPS (GitHub Pages) | ✅ OK | - |
| Responsive Design | ✅ OK | - |
| Theme Parameters Support | ❌ Missing | 🟠 High |
| Back Button Handling | ❌ Missing | 🟠 High |
| Main Button Integration | ❌ Missing | 🟠 High |
| Cloud Storage Usage | ❌ Missing | 🟡 Medium |
| Telegram Stars Payments | ❌ Mock | 🔴 Critical |
| Invoice Creation | ❌ Mock | 🔴 Critical |
| Payment Verification | ❌ Missing | 🔴 Critical |

---

## 🎯 PIANO DI REMEDIATION

### FASE 1: CRITICAL FIXES (BLOCKERS)

1. **Rimuovere Backend Python**
   - Eliminare `backend/` folder
   - Rimuovere dependencies MongoDB

2. **Implementare Telegram WebApp SDK**
   ```html
   <script src="https://telegram.org/js/telegram-web-app.js"></script>
   ```

3. **Implementare Authentication**
   - Validazione initData in edge functions
   - JWT tokens con telegram_id

4. **Configurare Bot Telegram**
   - Creare bot con @BotFather
   - Impostare webhook
   - Configurare menu button

5. **Fix Security**
   - Implementare RLS policies complete
   - Validare ogni request
   - Rate limiting

### FASE 2: RIMOZIONE PLACEHOLDER

6. **Rimuovere Mock Code**
   - DEFAULT_PLAYER
   - temp wallet generation
   - mock payments

7. **Implementare Real Payments**
   - Telegram Stars integration
   - Invoice creation real
   - Payment webhook handler

### FASE 3: POLISH

8. **Testing**
   - Test su Telegram mobile
   - Test payments
   - Security audit

9. **Documentation**
   - README aggiornato
   - API documentation
   - Deployment guide

---

## 🏗️ NUOVA ARCHITETTURA CORRETTA

```
┌─────────────────────────────────────┐
│   TELEGRAM BOT (@GHempireBot)      │
│   - Webhook configured              │
│   - Menu button → Mini App          │
│   - Stars payments                  │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   FRONTEND (GitHub Pages)           │
│   https://marcone1983.github.io     │
│   - Telegram WebApp SDK             │
│   - initData → Edge Function        │
│   - TonConnect for wallet           │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   SUPABASE EDGE FUNCTIONS           │
│                                     │
│   ┌─────────────────────────────┐  │
│   │  telegram-webhook           │  │
│   │  - Validate signature       │  │
│   │  - Handle commands          │  │
│   │  - Process payments         │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │  game-api                   │  │
│   │  - Validate initData        │  │
│   │  - All game logic           │  │
│   │  - Protected endpoints      │  │
│   └─────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   SUPABASE POSTGRESQL               │
│   - RLS enabled                     │
│   - Secure policies                 │
│   - Telegram auth                   │
└─────────────────────────────────────┘
```

---

## 💰 STIMA EFFORT

| Task | Effort | Priority |
|------|--------|----------|
| Remove Python backend | 1h | 🔴 |
| Implement Telegram WebApp SDK | 4h | 🔴 |
| Authentication + initData validation | 6h | 🔴 |
| Configure bot + webhook | 2h | 🔴 |
| Fix security + RLS | 4h | 🔴 |
| Remove all placeholders | 3h | 🟠 |
| Implement real payments | 8h | 🟠 |
| Testing + fixes | 4h | 🟡 |
| **TOTALE** | **32h** | |

---

## ✅ PROSSIMI STEP IMMEDIATI

1. **STOP** - Non pubblicare in questo stato
2. Confermare piano remediation
3. Creare bot con @BotFather
4. Iniziare FASE 1 critical fixes
5. Test incrementali
6. Solo dopo → submission Telegram

---

## 📚 RISORSE NECESSARIE

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram WebApps Documentation](https://core.telegram.org/bots/webapps)
- [Telegram Stars Payments](https://core.telegram.org/bots/payments)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview)

---

**CONCLUSIONE:** Il progetto ha una base solida ma necessita refactoring critico per essere conforme ai requirements Telegram Mini App e production-ready. Tutti i problemi sono risolvibili ma richiedono intervento immediato.
