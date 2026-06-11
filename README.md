# Macros 🍎

A simple fitness & macros tracker that lives **entirely on your phone**. No
account, no servers, nothing sent anywhere — your food log is stored in your
phone's browser and stays there.

It installs to your iPhone home screen as an app icon (it's a Progressive Web
App), opens full-screen with no browser bars, and works offline.

## What it does

- Track **calories, protein, carbs, and fat** for each day
- A calorie ring + macro bars show how much you have left
- Set your own **daily goals**
- Swipe back through previous days
- Quick-add from foods you've logged before
- Leave calories blank and they're estimated from your macros (4 / 4 / 9)

## Put it on your iPhone (one time, ~30 seconds)

This app is hosted free on **GitHub Pages**. Once it's live:

1. On your iPhone, open the app's web address in **Safari**
   (it'll be `https://<your-github-username>.github.io/Fitness-and-Macros-/`).
2. Tap the **Share** button (the square with an arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

You'll now have a **Macros** icon on your home screen. Tapping it opens the app
full-screen, just like a native app. All your data lives on the phone.

> Android: open the link in Chrome → menu (⋮) → **Add to Home screen / Install app**.

## Turning on the free hosting (one time)

After this is pushed to the `main` branch on GitHub:

1. Go to the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Wait ~1 minute for the "Deploy to GitHub Pages" action to finish.
4. Your link appears at the top of the Pages settings — open that in Safari and
   follow the steps above.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole app (UI + logic, one file) |
| `manifest.json` | Makes it installable as an app |
| `service-worker.js` | Offline support / caching |
| `icons/` | Home-screen app icons |
| `.github/workflows/deploy-pages.yml` | Auto-publishes to GitHub Pages |

## Your data

Everything is stored locally with your browser's `localStorage`. It is **not**
backed up to the cloud. If you delete the app or clear Safari's website data,
the log is gone. (Want iCloud backup or sync between devices later? That can be
added.)
