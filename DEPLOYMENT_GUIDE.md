# 🚀 G-HEMPIRE - DEPLOYMENT GUIDE

**Version:** 1.0.0
**Date:** 2026-02-09
**Status:** Production Ready

---

## 📋 PRE-REQUISITI

Prima di iniziare, assicurati di avere:

- ✅ Account GitHub
- ✅ Account Telegram
- ✅ Account Supabase (già configurato)
- ✅ Bot token Telegram (@BotFather)

---

## 🤖 STEP 1: CREARE BOT TELEGRAM

### 1.1 Aprire @BotFather su Telegram

```
https://t.me/BotFather
```

### 1.2 Creare il Bot

Invia i seguenti comandi:

```
/newbot
```

Segui le istruzioni:
1. **Nome del bot:** `G-HEMPIRE` (o nome a tua scelta)
2. **Username del bot:** `GHempireBot` (deve finire con `bot`)

### 1.3 Ottenere il Token

@BotFather ti fornirà un token simile a:
```
6234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
```

⚠️ **IMPORTANTE:** Salva questo token in modo sicuro!

### 1.4 Configurare Bot Settings

Esegui questi comandi su @BotFather:

```
/setdescription
[Seleziona il tuo bot]
```

Invia questa descrizione:
```
G-HEMPIRE - Build your cannabis farming empire! Grow premium EVO strains, earn GLeaf tokens, stake for rewards and compete on the leaderboard. Powered by TON Blockchain.
```

```
/setabouttext
[Seleziona il tuo bot]
```

Invia:
```
Cannabis farming empire game on TON Blockchain. Grow, earn, compete!
```

```
/setuserpic
[Seleziona il tuo bot]
[Carica un'immagine 512x512 per il bot]
```

---

## 🔧 STEP 2: CONFIGURARE SUPABASE

### 2.1 Impostare Bot Token

1. Vai su Supabase Dashboard: https://app.supabase.com
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Edge Functions** → **Environment Variables**
4. Aggiungi la variabile:
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** Il token ricevuto da @BotFather
   - **Function Scope:** Select `telegram-webhook` e `game-api`

### 2.2 Verificare Edge Functions

Vai su **Functions** nel menu laterale e verifica che siano deployate:

- ✅ `game-api` - Status: ACTIVE
- ✅ `telegram-webhook` - Status: ACTIVE

### 2.3 Testare Webhook Endpoint

Apri nel browser (sostituisci con il tuo URL):
```
https://skpwsivnqjougllkllfr.supabase.co/functions/v1/telegram-webhook
```

Dovresti vedere:
```json
{
  "status": "not_configured",
  "bot_username": "unknown",
  "webhook_url": "",
  "game_url": ""
}
```

---

## 🌐 STEP 3: SETUP WEBHOOK TELEGRAM

### 3.1 Preparare Richiesta Setup

Usa questo endpoint per configurare il webhook:

```bash
POST https://YOUR_SUPABASE_URL/functions/v1/telegram-webhook/setup
```

**Body (JSON):**
```json
{
  "bot_token": "6234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw",
  "bot_username": "GHempireBot"
}
```

### 3.2 Eseguire Setup (con curl)

```bash
curl -X POST \
  https://skpwsivnqjougllkllfr.supabase.co/functions/v1/telegram-webhook/setup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "bot_token": "YOUR_BOT_TOKEN",
    "bot_username": "GHempireBot"
  }'
```

### 3.3 Risposta Attesa

Se tutto va bene, riceverai:
```json
{
  "ok": true,
  "bot": {
    "id": 1234567890,
    "first_name": "G-HEMPIRE",
    "username": "GHempireBot"
  },
  "setup_results": {
    "webhook": { "ok": true },
    "commands": { "ok": true },
    "description": { "ok": true },
    "menu_button": { "ok": true },
    "config_saved": true
  }
}
```

---

## 📱 STEP 4: DEPLOY GITHUB PAGES

### 4.1 Push Changes

```bash
git add .
git commit -m "Production deployment with Telegram integration"
git push origin main
```

### 4.2 Configurare GitHub Pages

1. Vai su **Repository** → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**
4. Folder: **/docs**
5. Click **Save**

### 4.3 Attendere Deploy

Dopo 2-3 minuti, l'app sarà disponibile su:
```
https://marcone1983.github.io/G-HEMPIRE/
```

---

## ✅ STEP 5: TEST COMPLETO

### 5.1 Test Bot Telegram

1. Cerca il tuo bot su Telegram: `@GHempireBot`
2. Invia `/start`
3. Dovresti ricevere il messaggio di benvenuto con pulsanti

### 5.2 Test Mini App

1. Nel bot, clicca **"🌱 Play Game"**
2. La WebApp dovrebbe aprirsi correttamente
3. Verifica che vedi:
   - Loading screen
   - Player dashboard con coins/gems/energy
   - Garden con 4 plot sbloccati

### 5.3 Test Funzionalità

**Garden:**
- ✅ Clicca su un plot vuoto
- ✅ Seleziona "EVO KUSH"
- ✅ Verifica che la pianta inizi a crescere
- ✅ Attendi che sia ready e harvesta

**Shop:**
- ✅ Vai nella tab Shop
- ✅ Verifica che vedi boosts, VIP, cosmetics, NFTs
- ✅ Prova ad acquistare un boost

**Staking:**
- ✅ Vai nella tab Stake
- ✅ Verifica che puoi stake GLeaf

**Wallet:**
- ✅ Vai nella tab Wallet
- ✅ Clicca "Connect TON Wallet"
- ✅ Verifica TonConnect modal

**Profile:**
- ✅ Vai nella tab Profile
- ✅ Clicca "Daily Reward"
- ✅ Verifica che ricevi rewards

### 5.4 Test Referral System

1. Nel bot Telegram, clicca **"👥 Invite Friends"**
2. Copia il link referral
3. Apri in una nuova sessione/dispositivo
4. Verifica che nuovo player riceve bonus

---

## 🔐 SECURITY CHECKLIST

Prima del lancio pubblico, verifica:

- ✅ Bot token non è esposto nel codice
- ✅ Environment variables configurate correttamente
- ✅ Telegram initData validation attiva
- ✅ RLS policies abilitate su tutte le tables
- ✅ CORS configurato correttamente
- ✅ Rate limiting considerato

---

## 📊 MONITORAGGIO

### Logs Edge Functions

```bash
# Nel dashboard Supabase
Edge Functions → Seleziona function → Logs
```

### Database Monitoring

```sql
-- Verificare nuovi player
SELECT COUNT(*) FROM players WHERE created_at > NOW() - INTERVAL '1 day';

-- Top players
SELECT username, gleaf, level FROM players ORDER BY gleaf DESC LIMIT 10;

-- Transazioni recenti
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20;
```

### Telegram Bot Status

```
https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

---

## 🐛 TROUBLESHOOTING

### Bot non risponde

**Sintomo:** Invio `/start` ma nessuna risposta

**Soluzione:**
1. Verifica webhook: `getWebhookInfo`
2. Check logs edge function `telegram-webhook`
3. Verifica bot_token in environment variables

### Mini App non si apre

**Sintomo:** Click "Play Game" ma niente succede

**Soluzione:**
1. Verifica GitHub Pages è attivo
2. Check console browser per errori
3. Verifica URL game in bot_config table

### Authentication Failed

**Sintomo:** Errore "Unauthorized" nelle API calls

**Soluzione:**
1. Verifica Telegram WebApp SDK caricato
2. Check initData è inviato negli headers
3. Verifica bot_token in edge function

### Database RLS Errors

**Sintomo:** Permission denied su queries

**Soluzione:**
```sql
-- Verificare policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Se mancano, ricrearle
-- Vedi migrations in supabase/migrations/
```

---

## 📈 NEXT STEPS

Dopo il deploy di successo:

1. **Marketing:**
   - Condividi il bot su gruppi Telegram
   - Post su social media
   - Aggiungi bot su directory Telegram

2. **Analytics:**
   - Setup Telegram Bot Analytics
   - Monitor user retention
   - Track conversion rates

3. **Monetization:**
   - Implementare Telegram Stars payments
   - Configurare withdrawal TON
   - Setup revenue wallet

4. **Features:**
   - Aggiungere nuove crop varieties
   - Implementare multiplayer battles
   - NFT minting e trading

---

## 🆘 SUPPORT

**Problemi?**
- Check AUDIT_REPORT.md per issues comuni
- Review logs in Supabase Dashboard
- Test con @BotFather webhook status

**Resources:**
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Supabase Docs](https://supabase.com/docs)
- [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview)

---

**🎉 Congratulazioni! Il tuo G-HEMPIRE è live!**

Ricorda di mantenere aggiornato il codice e monitorare la sicurezza regolarmente.
