# Apple Health → the grind: iOS Shortcut recipe

Each teammate's iPhone syncs Health data to the `/fitness` board with one iOS
Shortcut. Build it once, share the iCloud link, everyone else imports it and
swaps in their own token. ~10 minutes to build, ~2 minutes to import.

**Your personal token** lives on the `/fitness` page (connect card → reveal/copy).
Never commit tokens anywhere — each person's token identifies *them*.

---

## What it sends

`POST https://synthos-os.vercel.app/api/health-sync`
Headers: `Content-Type: application/json` + `x-health-token: <your token>`

```json
{
  "days": [
    {
      "day": "2026-07-10",
      "steps": 8123,
      "sleepMin": 412,
      "moveKcal": 480,
      "exerciseMin": 25,
      "standHours": 9,
      "workouts": [{ "type": "Outdoor Run", "min": 32, "kcal": 301 }]
    }
  ]
}
```

Only `day` is required — send whatever your device tracks. Steps come from any
iPhone; sleep/workouts/rings need an Apple Watch (or a sleep app writing to
Health). The server clamps values and ignores anything it doesn't recognize.

## Build the Shortcut (once, on one phone)

Open **Shortcuts → + → rename to "sync the grind"**, then add these actions in
order (search each by name). Grant Health access when prompted.

1. **Date** → Current Date.
2. **Format Date** → Date: *Current Date*, Format: **Custom**, string `yyyy-MM-dd`.
   (This becomes `day`.)
3. **Find Health Samples** → Type: **Steps**, filter **Start Date ▸ is today**,
   Group By: **Day**. Then **Get Numeric Value** if needed — the grouped result
   is the de-duplicated daily total (never sum raw samples: iPhone + Watch
   double-count).
4. **Find Health Samples** → Type: **Sleep Analysis**, filter
   **Start Date ▸ is in the last 18 hours**, Sleep state: **Asleep** (leave
   ungrouped) → **Calculate Statistics ▸ Sum** of Duration → minutes. (Last
   night's sleep, attributed to today.)
5. **Find Health Samples** → Type: **Active Energy**, Start Date is today,
   Group By Day → `moveKcal`.
6. **Find Health Samples** → Type: **Exercise Minutes**, Start Date is today,
   Group By Day → `exerciseMin`.
7. **Find Health Samples** → Type: **Stand Hours**, Start Date is today,
   Group By Day → `standHours`.
8. **Find Workouts** → filter **Start Date ▸ is today**. Then **Repeat with
   Each** → inside the repeat, **Dictionary** with `type` = Workout ▸ Activity
   Type, `min` = Workout ▸ Duration (minutes), `kcal` = Workout ▸ Active Energy
   → **Add to Variable** `workoutList`.
9. **Dictionary** (the day):
   - `day` = the formatted date (step 2) — *text*
   - `steps`, `sleepMin`, `moveKcal`, `exerciseMin`, `standHours` = the numbers
     above — *number*
   - `workouts` = variable `workoutList` — *array* (leave `[]` if no watch)
10. **Dictionary** (the body): `days` = *array* containing the day dictionary.
11. **Get Contents of URL** →
    - URL: `https://synthos-os.vercel.app/api/health-sync`
    - Method: **POST** · Request Body: **JSON** → the body dictionary
    - Headers: `x-health-token` = **your token**
12. (Optional) **Show Notification** with the URL result — handy while testing,
    delete it once it works.

Run it manually once — the `/fitness` page updates within a second or two
(realtime). Response `{"ok":true,"saved":1,...}` means it landed.

## Automate it (each phone)

Shortcuts → **Automation → + → Time of Day → Run Immediately** (no "Ask"),
pointing at *sync the grind*. Create **three**:

- **~9:00 am** — catches last night's sleep + the morning so far
- **~2:30 pm** — midday race update
- **~10:30 pm** — final numbers for the day

Three syncs a day keeps the step race lively (and the overtake pushes honest).
Heads-up: iOS can fail Health reads if the phone is locked when an automation
fires — pick times you're normally using the phone. A missed run heals at the
next one; today's board only needs one successful sync to be current.

## Share it with the squad

**First, blank out your token** — edit action 11 and replace the
`x-health-token` value with the placeholder text `PASTE-YOUR-TOKEN`. An iCloud
link ships the Shortcut exactly as-is, so sharing it with your real token
inside hands your identity on the board to anyone who opens the link.

Then: Shortcut → **⋯ → Share → Copy iCloud Link** → drop it in #general. Each
teammate: open link → **Add Shortcut** → edit action 11 and paste **their own**
token from `/fitness` → set up the three automations on their phone. (You
re-paste yours too.)

## Troubleshooting

- `401 bad token` — the token doesn't match; re-copy from `/fitness`.
- `400 no valid days` — the `day` field isn't `yyyy-MM-dd` text (check step 2).
- Steps look doubled — you summed raw samples; use **Group By: Day** (step 3).
- Nothing on the board — run the Shortcut manually and check the response body
  with a temporary Show Notification / Quick Look action.
