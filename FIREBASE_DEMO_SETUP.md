# Permanent demo — Firebase setup

Use a **dedicated Firebase project** for the live demo so it stays separate from experiments and old test data.

## 1. Create the demo project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → name it e.g. `summit-build-demo`
3. Google Analytics optional (off is fine for a demo)
4. Wait for the project to finish creating

## 2. Enable Auth + Firestore

### Authentication

1. **Build → Authentication → Get started**
2. **Sign-in method → Google → Enable**
3. Set a support email and save

### Firestore

1. **Build → Firestore Database → Create database**
2. Start in **production mode** (we deploy rules from this repo)
3. Pick a region close to you (e.g. `us-central1`)

## 3. Register the web app

1. **Project settings** (gear) → **Your apps → Web** (`</>`)
2. App nickname: `Summit Build Demo`
3. Copy the `firebaseConfig` values into `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_OWNER_EMAILS=you@gmail.com
```

4. Copy `.env.local.example` → `.env.local` if you have not already

## 4. Authorized domains (required for Google sign-in)

**Authentication → Settings → Authorized domains** — add:

| Domain | When |
|--------|------|
| `localhost` | Local dev (usually already there) |
| `illegal-construction-co.vercel.app` | Current Vercel URL |
| Your custom domain | If you add one later |

## 5. Deploy Firestore rules from this repo

Rules live in `firestore.rules` (homepage leads without login; everything else requires sign-in).

```bash
npm install -g firebase-tools
firebase login
copy .firebaserc.example .firebaserc
# Edit .firebaserc — set default project to YOUR_DEMO_PROJECT_ID

firebase deploy --only firestore:rules --project YOUR_DEMO_PROJECT_ID
```

Or in Firebase Console: **Firestore → Rules**, paste the contents of `firestore.rules`, **Publish**.

## 6. Point the app at the new project

### Local

1. Update `.env.local` with the new project values
2. `npm run dev`
3. Sign in to `/portal` with your owner email — first owner is bootstrapped automatically

### Vercel (production demo)

1. Vercel project → **Settings → Environment Variables**
2. Update all `NEXT_PUBLIC_FIREBASE_*` vars and `NEXT_PUBLIC_OWNER_EMAILS`
3. **Redeploy** (env changes need a new deployment)

## 7. What you get with a fresh project

- **Empty database** — clean demo for clients (no old tickets/inventory)
- **Old project** (`illegal-construction-co`) is unchanged; you can keep it as a backup or delete later
- **Portal theme** stays in the browser (`portal-theme` in localStorage), not in Firebase

## Collections used by the app

| Collection | Purpose |
|------------|---------|
| `quoteRequests` | Homepage contact form |
| `tickets` | Customer pricing tickets |
| `users` | Signed-up accounts |
| `appConfig/roles` | Owner & employee access |
| `callNotes` | Portal call notes |
| `schedule` | Job schedule |
| `analyticsWeekly` | Owner analytics history |
| `inventory` | Stock items |
| `inventoryTransactions` | Pulls / restocks |
| `purchaseOrders` | POs |
| `expenses` | Expense log |

## Spark (free) plan

Auth + Firestore fit the free tier for demo traffic. Storage is not required (image uploads are disabled in the app).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Google sign-in fails on Vercel | Add Vercel domain to Firebase authorized domains |
| Permission denied on writes | Deploy `firestore.rules` or publish rules in console |
| Not owner in portal | Set `NEXT_PUBLIC_OWNER_EMAILS` to your Google email, redeploy, sign in again |
| Still hitting old data | Confirm `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in `.env.local` / Vercel matches the **new** project |
