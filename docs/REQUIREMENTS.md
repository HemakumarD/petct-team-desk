# Requirements, rules and operating notes

The full specification is the master prompt in [`../PROMPT.md`](../PROMPT.md). This page collects the screens, rules and operating notes.

## Screens

| Screen | What it does |
|---|---|
| Today | Date picker, Today / Tomorrow-planning / Discard changes shortcuts, Daily snapshot and Copy summary, Pull from appointment sheet, Print, hero card (booked, done, pending, cancelled), Domestic / Bangladesh / Other SAARC / Non-SAARC tiles, day billing balance, planning card, reports pending over 24 h, appointment list with one-tap next status |
| Add case | Camera – paper, Camera – phone screen, choose files (PDF / JPG / JPEG / PNG), paste WhatsApp message, Claude fills the form, multi-patient queue, repeat-patient hint, automatic name tidy, auto tariff with discount and balance, Save / Discard changes |
| Case detail (bottom sheet) | Status chips, prep checklist, prep message in English / Tamil / Bengali, edit all fields incl. billing, Save / Discard changes / Print slip / Delete, history with who and when |
| Appointment sheet (bottom sheet) | Pick a date, list patients from PET CT APPOINTMENT 2026 with UHIDs and tags (New / Add UHID / Already in app / Repeat / Renal report), Copy UHIDs, country per row, Import selected |
| Cases | Search, collapsible filters (dates, type, unit, status), list with avatars and balance, CSV export |
| Dashboard | Range chips, Print report, KPIs, target and milestone bars, patient mix, six charts, standard statistics, unit / doctor / country / turnaround / scan purpose tables, billing (gross, discount, net by type and category), doctors to follow up, new doctors, month-wise trend |
| Discard changes | Every save newest first with filter chips and Undo; deleted cases can be restored |
| Settings | Discard changes link, referred-to default, target, FY start, Domestic and International tariffs, appointment sheet location, desk phone, fasting hours, opening scan count, + button reset, unit list, scan type list, install instructions |

## Rules and definitions

A case counts as booked unless it is Cancelled or No-show; "completed" means Scan Done or Reported.

| Item | Rule |
|---|---|
| Domestic | Country = India (or not stated) |
| International – Bangladesh | Country = Bangladesh; clues: Bangladeshi address, passport, +880 phone |
| International – Other SAARC | Nepal, Bhutan, Sri Lanka, Maldives, Afghanistan, Pakistan |
| International – Non-SAARC | Any other country |
| Domestic tariff | ₹ 27,300.00 (Settings) |
| International tariff | ₹ 38,500.00 for Bangladesh, Other SAARC and Non-SAARC (Settings) |
| Balance payable | Amount − discount; discount cannot exceed amount |
| Money format | Accounting: ₹ 27,300.00, Indian grouping, negatives in brackets (PDFs use "Rs.") |
| Statuses | Scheduled → Prep Informed → Arrived → Scan Done → Reported; Cancelled; No-show |
| Daily average | Over working days; a Sunday counts only if it had cases |
| Turnaround time | From the time each status was set in the app (booking = time the case was added) |
| Report pending alert | Status Scan Done for more than 24 hours |
| Doctor to follow up | Referred between 120 and 30 days ago, nothing in the last 30 days |
| Milestone | Opening count (Settings) + all Scan Done / Reported cases; next target 1,000, then every 500 |
| Sheet match | Same date and same UHID or same name = already in app; same name without UHID = add UHID; same UHID on an earlier date = repeat |
| Name format | Title + dot + one space, then proper case (Mr. Kannan G); doctors as Dr. Name |
| Change history | Last 200 saves kept with Undo |

## Sharing and operating model

- Link: https://hemakumard.github.io/petct-team-desk/ (GitHub Pages, from the public repo HemakumarD/petct-team-desk). Send it on WhatsApp. Opening it does not show any data.
- Install: iPhone Safari → Share → Add to Home Screen; Android Chrome → ⋮ → Install app.
- Team data: every device signs in under Settings → Google Drive sync with **the same team Google account** (a dedicated PET-CT Gmail is best). The app creates petct-team-desk-data.json in that Drive. Sharing the file with other accounts does not work, because the app sees only files it created.
- AI reading needs a Claude API key in Settings on each device that reads documents. Others can type cases by hand.
- Since 28-Oct-2026 Hemakumar is the single entry point. The team posts cases in the PET-CT WhatsApp group; Hemakumar enters them or loads them from the sheet, and posts the daily snapshot.

## Privacy

Patient names, UHIDs and phone numbers stay on each device and in the team Google account's Drive file. Documents sent for AI reading go to the Anthropic API. Get Apollo IT / compliance approval before live use. The repository is public and holds code and documentation only, never real patient data.

## App Store / Play Store

Not needed for the team: the GitHub version installs from the link as a home-screen app. A store listing would still need a native build, its own server and database, an OCR / AI service, Microsoft 365 app permissions from Apollo IT, Apple Developer (US$99 / year) and Google Play (US$25 once) accounts in Apollo's name, and DPDP Act 2023 compliance; distribution would be private (TestFlight / Apple Business Manager, private Play listing).
