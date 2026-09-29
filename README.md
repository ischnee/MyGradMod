# MyGradMod

A browser bookmarklet for the UW Philosophy graduate program. Run it on **MyGrad → Students → By Quarter** and it opens a dashboard of the whole program:
- a summary of where the program stands
- every entering class's progress and outcomes
- each current student's milestones, flags and funding

It adapts the approach of Ben Marwick's [uw-anthro-web-helpers](https://github.com/benmarwick/uw-anthro-web-helpers) (UW Anthropology), especially his MyGrad Table Audit bookmarklet.

## A Note on Student Privacy and Data Security

**⚠️ Disclaimer & FERPA Warning**:
- This script is an unofficial tool created to assist authorized UW faculty/staff workflows.
- This script accesses FERPA-protected education records.
- Use is restricted to authorized UW faculty/staff with legitimate educational interest.
- This script is not officially supported or endorsed by the University of Washington or the UW Department of Philosophy.
- Users of this tool are solely responsible for ensuring compliance with FERPA and [UW Data Security policies](https://it.uw.edu/policies/security-and-privacy-policies/uw-information-security-policies/).
- Official UW records always take precedence.
- No automated decisions are made about students using this tool.

The script does not collect or use any information about the student outside of MyGrad. The script does not use or contain AI. The data collected by the script are protected by the Family Educational Rights and Privacy Act ([FERPA](https://registrar.washington.edu/staff-faculty/ferpa/)) of 1974 and must not be shared outside of the UW Philosophy advising office without written consent of the student. No data are collected from your computer.

**How MyGradMod handles student data:**
- **It runs entirely in your browser.** It reads MyGrad data you can already see while logged in, and opens the dashboard in a new tab.
  - Nothing is sent anywhere.
  - Nothing is stored except your display settings: flag thresholds, the classes the slider selects, and which sections are collapsed. These are kept in your browser.
- **It takes only the fields it needs.** It never uses ethnicity, gender, visa status, residency, addresses, emails, NetIDs, student numbers, GRE scores or previous institutions.
- **Former students appear only as class totals.** The one exception: hovering a former student's dot shows their name and outcome, and for PhDs, their years to degree. Showing their initials on the dots is an optional setting, off by default.
- **The dashboard's footer repeats the rules:** these are student records protected by FERPA, for authorized faculty and staff only. Don't share or screenshot them outside that group, and close the tab when you're done.
- **It was built and tested without seeing student data.**
  - MyGrad's formats were learned from console checks that printed only field names, value formats or counts.
  - The dashboard was developed against a fake MyGrad with made-up students.
  - **The screenshots below show made-up students only.**

## Requirements

- Using your official UW-issued computer, use your UW credentials to log in to [MyGrad Department View](https://facstaff.grad.uw.edu/mygrad-for-faculty-and-staff/#mygrad-faculty-staff-2). These are FERPA-protected education records and this view is only available to authorized faculty and staff in GPC/GPA roles.
- Google Chrome (the browser it was tested in).

## How to install

This repository is private, so the bookmarklet can't be loaded through jsDelivr the way the loader bookmarks in Ben's README are. Install it directly, either way:

- **Import the bookmark file (easiest):**
  - In Chrome, open **Bookmarks → Bookmark Manager**.
  - Click the ⋮ menu at the top right and choose **Import bookmarks**.
  - Choose `MyGradMod.html` from this repository.
- **Or add it by hand:**
  - Create a new bookmark named "MyGradMod".
  - Paste the entire contents of `bookmarklet-mygradmod.js` (it starts with `javascript:`) into the URL field.

To update to a newer version, delete the old bookmark and install again.

## How to use

- Log in to MyGrad Department View as described under Requirements.
- Go to **Students → By Quarter** and pick a quarter.
- Click the **MyGradMod** bookmark. The dashboard opens in a new tab. If Chrome blocks it, allow pop-ups for MyGrad.
- Close the dashboard tab when finished.

## What's on the dashboard

- **Program summary:**
  - Students in the program (PhD and MA), on schedule vs. stalled.
  - Flagged students.
  - Funding this quarter, and others available to TA.
  - Outcomes for the latest 10 cohorts: the share who earned the PhD and average years to PhD.
- **Entering classes:** a slider chooses which cohorts to show. For each cohort, the table shows:
  - where its current students are: pre-MA, MA done, committee or candidate, colored by whether they're on schedule
  - one dot per student who entered: filled if enrolled, a ring colored by outcome if they have left
  - how many are flagged
  - how many left with no degree, left with an MA, or earned the PhD
  - mean and median years to PhD
- **Students:** grouped by cohort, with each student's stage, program, status, advisor, milestones, funding and flags.
  - Views: In the program, Flagged, All.
  - Search by name or advisor.
  - Clicking a cohort, stage cell or dot highlights those students across the page.
- **Settings (gear icon):** flag thresholds, plus display options.

Hovering explains most numbers in place, e.g. why a cell is marked "stalled".

## Cautions

- **Philosophy-specific defaults.** Flag thresholds follow the 2026–27 Philosophy Graduate Handbook: MA by the end of year 2, doctoral committee by year 3, candidacy by year 4, reading committee by year 4, and the Graduate School's 10-year doctoral and 6-year master's limits. Change them under Settings. Year in program counts from the admission quarter and doesn't subtract leave.
- **MyGrad's own data has quirks.** Some students' details come only from older or inactive records, which can be out of date.
  - Examples: a speaking requirement still listed as "Required", or an advisor yes/no field that lags behind the advisor list.
  - The dashboard reads these fields loosely, and hover text shows MyGrad's own value.
  - A flag is a prompt to look, not a finding: **check the student's official MyGrad record before acting.**
- **Counts can differ from MyGrad's list.** Students whose PhD has been awarded can stay on MyGrad's By Quarter list. The dashboard shows them in the entering-class history, not among current students. Hover **All** to see how the count reconciles with MyGrad's.
- **Recent outcomes are partial.** For cohorts with students still enrolled, the PhD share counts only those who have already finished or left, and is marked with an asterisk (\*).
- **Older cohorts may be incomplete** if MyGrad no longer keeps their records.

## Screenshots (made-up students)

![Program summary](screenshots/1-summary.png)

![Entering classes](screenshots/2-entering-classes.png)

![A stage cell selected](screenshots/3-selected-stage.png)

![Students grouped by cohort](screenshots/4-students.png)

![Older cohorts and outcomes](screenshots/5-history-and-outcomes.png)
