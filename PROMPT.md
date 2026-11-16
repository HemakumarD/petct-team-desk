# PET-CT Team Desk – Master prompt

Version 13 · 16-Nov-2026. Copy everything in the box into a new Claude chat to rebuild or extend the app. Write new requirements under CHANGE REQUESTS at the end; existing cases are kept.

The live master copy is the Claude Doc: https://claude.ai/artifact/2uCroKCSJroHN1ZKyEcqKJ – keep both in step.

```markdown
Build / update the "PET-CT Team Desk" app for the PET-CT team at Apollo Cancer Centres, Vanagaram, Chennai.
Existing app: GitHub repo HemakumarD/petct-team-desk, live at https://hemakumard.github.io/petct-team-desk/ (keep all saved data). The older claude.ai copy is at https://claude.ai/artifact/EfmABMgGKzG5uFRrdRiDyd.
Owner: Hemakumar D, DGM - Oncology. Reporting doctor (PET): Dr. Abdul Rahim Syed. PET-CT secretary: Ms. Malini Omprakash.

PLATFORM
- Runs from GitHub Pages, not claude.ai: one mobile-first web page (installable PWA, offline cache) that works on iPhone and Android. Install with "Add to Home Screen" / "Install app".
- Source: claude/index.html (base app) + src/standalone-shim.js and src/standalone-inner.js; src/build.py writes index.html.
- Data in IndexedDB on each device. Team sync goes through one Google Drive file (petct-team-desk-data.json, drive.file scope, Google Identity Services); merge by timestamp with delete tombstones, every 60 s and when the app is reopened.
- AI reading uses the Anthropic API from the browser with the owner's key, stored on the device (Settings → AI reading; model selectable). Without a key, cases are typed by hand.
- Backup: download every case, setting and change as JSON; import a backup.
- Apollo teal (#00727c) and gold (#c99a2e); dates dd-mmm-yyyy; Indian FY (April start); money in accounting format.

DESIGN (very professional native iOS / Android look)
- Frosted app bar with logo, "PET-CT Desk", unit name and date pill; large page titles; system font (San Francisco / Roboto).
- Bottom tab bar (Today, Add case, Cases, Dashboard, Settings) with active pill; floating + button to add a case; the + button can be dragged anywhere on screen (touch or mouse, kept clear of the top bar and bottom tabs), a quick tap still opens Add case, its position is remembered per device, and Settings has Reset position.
- Today hero card (booked, scans done, pending, cancelled) + patient-type tiles + billing tile.
- Grouped forms (Patient, Referral, Appointment, Billing, Notes); list cells with coloured initials avatar (colour = patient type, initials skip Mr./Mrs.), amount and chevron; bottom sheets with grabber; snackbar toasts.

CAPTURING A CASE
- Camera - paper, Camera - phone screen (labels wrapping a file input with capture="environment" so the phone camera opens directly), or choose files: PDF incl. scanned/OCR, JPG, JPEG, PNG, up to 4 pages.
- Paste a WhatsApp message from the PET-CT group; one message or screen photo may contain several patients - fill them one after another.
- Claude extracts name, age, gender, UHID, phone, referring doctor, referring unit (matched to the unit list), country, diagnosis, scan type, appointment date/time, and flags uncertain fields; the user checks highlighted fields before saving. Only extracted details are stored, not images.
- "Referred to" defaults to Dr. Abdul Rahim Syed (editable in Settings).
- Repeat patient detection by UHID suggests "Follow-up".

NAME FORMATTING
- On leaving the name box, on save, after AI reading and on sheet import: a title typed without its dot or space ("Mr.KANNAN", "mrs  rukmani", "MS.LAKSHMI") becomes "Mr. Kannan", "Mrs. Rukmani", "Ms. Lakshmi". Titles: Mr., Mrs., Ms., Miss, Master, Baby, Dr., Smt., Shri, Sri, Selvi, Thiru, Prof. Rest in proper case, initials kept capital; names that only start with those letters (Mrinal) are left alone.
- Referring doctor names become "Dr. Firstname X" ("Self" kept).

PATIENT TYPE
- India = Domestic. Bangladesh = International - Bangladesh (always shown separately).
- Nepal, Bhutan, Sri Lanka, Maldives, Afghanistan, Pakistan = International - Other SAARC. Any other country = International - Non-SAARC.

CASE FIELDS
Name, age, gender, UHID, phone, country, patient type (auto), referred by, referring unit, referred to, date, time, scan type, status, diagnosis, scan purpose (baseline / follow-up / restaging), billing category, amount, discount, balance, notes, OP/IP, prep checklist, status history (who / when).

BILLING
- Amount auto-fills from patient type: Domestic Rs 27,300.00; International - Bangladesh, Other SAARC and Non-SAARC Rs 38,500.00 (both editable in Settings). Switches when the country changes; a manually typed amount is kept.
- Discount box; Balance payable = amount - discount, shown live; discount cannot exceed amount.
- Accounting format: "Rs 27,300.00" with the rupee sign, Indian grouping (11,85,000.00), negatives in brackets.
- Today shows the day's balance and discount; Dashboard shows gross, discounts and net by patient type and billing category; each list row shows the balance; CSV has Amount, Discount, Balance.

STATUSES
Scheduled -> Prep Informed -> Arrived -> Scan Done -> Reported; plus Cancelled and No-show.

PATIENT PREP
Checklist: fasting instructions, urea / creatinine report, diabetic status and sugar plan, previous scans / CDs, attender details. All ticked moves Scheduled to Prep Informed. Copy-ready prep instructions for WhatsApp in English, Tamil and Bengali using the desk phone and fasting hours from Settings.

TODAY SCREEN
Date picker with Today / Tomorrow-planning shortcuts; hero card and patient-type tiles; status filter; one-tap next status. Planning card: studies by scan type, first / last slot, prep-incomplete list, unconfirmed patients to call. Reports pending more than 24 hours after Scan Done.

PULL FROM APPOINTMENT SHEET
- Button on Today, "Appointment sheet (Excel)": the user loads the downloaded "PET CT APPOINTMENT 2026" .xlsx (from the Nuclear Medicine Vanagaram email, OneDrive → Download). It is read on the device with SheetJS, and the last file is remembered on the device.
- One tab per month (tab order is not chronological - find the tab by month name); date only on the first row of each day (fill down); time fills down within a day. Columns: Date, Day, Time, Patient Name, Age/Sex or Age + Sex, OP/IP, Diagnosis, UHID, Dr Name, Phone Number, Urea, Creatinine, Blood Report Date, Remarks.
- Choose a date (yesterday / today / tomorrow / day after / any). Each patient shows UHID, time, doctor, diagnosis, OP/IP and a tag: New, Add UHID to an existing case, Already in app, Repeat (last date), Renal report. Copy UHIDs button.
- Import selected: country chosen per row (default India; the sheet has no nationality), standard tariff, renal-report prep tick when urea / creatinine present, Main Apollo ward -> Greams Road unit, notes keep OP/IP, ward, urea / creatinine and remarks. Re-pulling never adds duplicates.

WHATSAPP DAILY UPDATE
Button for a branded PNG snapshot (totals, patient mix, unit-wise, referring doctors, month-to-date vs target, FY to date, total scans completed, booked for tomorrow) and a copy-ready text summary with WhatsApp bold formatting.

DASHBOARD
Ranges: today, last 7 days, this month, last month, FY to date, all time, custom. KPIs; monthly target with run-rate projection; scan milestone countdown (1,000 then every 500, incl. opening count). Charts: daily cases with cumulative line, cases by referring unit, domestic vs international, status, day of week, age bands by gender. Standard statistics: mean, median, SD, CV, IQR, 90th percentile, min / max, peak day, zero-case days, busiest weekday, mean and median age, male:female, international share, completion and cancellation rates, distinct doctors and units (Sundays without cases excluded from daily averages). Tables: unit-wise, top referring doctors, international patients by country, turnaround time, scan purpose, billing, doctors to follow up (referred 120-30 days ago, none in last 30), new referring doctors, month-wise trend with MoM growth and cumulative.

CASES LIST
Search (name / UHID / doctor / phone) with collapsible filters (dates, patient type, unit, status); edit, delete; export CSV for Excel.

PRINTING
Print buttons build a branded A4 PDF (jsPDF + autoTable, Apollo teal header, page numbers, printed-on stamp) and open it in a print window: Print (the computer's printer), Save PDF, or Share on phones. Three layouts: (1) Today > Print - landscape appointment list for the selected date (time, patient, age/sex, UHID, type, referred by, unit, scan, prep, status, balance, totals, signature lines); (2) case sheet > Print slip - one-page case slip (patient, referral, appointment, billing, prep checklist, notes, signature lines); (3) Dashboard > Print report - KPIs, four charts, standard statistics, unit, doctor, country, billing, turnaround and month-wise tables for the selected range. Money shown as "Rs. 27,300.00" in PDFs. If saving is unavailable, show the PDF in an in-app preview.

DISCARD CHANGES
Section (from Today and Settings) listing every save newest first - added, edited, status change, prep checklist, deleted, settings - with who and when and an Undo button that restores the previous state (an added case is removed, a deleted case is brought back). Keep the last 200. Add case and edit forms have a "Discard changes" button for unsaved typing.

SETTINGS (shared for the team)
Default referred-to doctor, monthly target, FY start month, Domestic and International tariffs, desk phone, fasting hours, scans completed before the app, referring unit list, scan type list, Reset position for the + button, Discard changes link, install instructions, Google Drive sync, AI reading (Claude API key and model), your name, Backup download / import.

ACCESS
- Anyone with the link can open the app, but data is visible only on devices signed in to the team Google account that holds the Drive file. drive.file scope means the app sees only files it created, so every device must use that same account.
- No claude.ai account is needed.

CHANGE REQUESTS (edit for each new version)
- 
```
