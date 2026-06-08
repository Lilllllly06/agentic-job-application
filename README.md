# Agentic Job Application

Career Agent is a local-first job search, resume tailoring, and application workspace. The MVP helps a candidate compare a resume or profile against a job description, identify skill and keyword gaps, generate targeted resume bullets, draft outreach text, and track applications.

## Current MVP

- Configure an autopilot control center for SWE/MLE target roles, locations, company ranking, job types, minimum score, and approval mode.
- Paste a candidate profile or resume notes.
- Import a private LaTeX resume file in the browser and parse it into profile text.
- Save private resume versions in browser `localStorage`.
- Paste a job description and target role.
- Generate a fit score, required skill coverage, keyword gaps, one-page resume draft, focus plan, cover letter opener, outreach note, and interview prompts.
- Generate a one-page cover letter draft whenever an application has a cover-letter option.
- Save an opportunity into an application tracker with job link, contact, deadline, notes, status, and next action.
- Persist tracked applications in browser `localStorage`.
- Export a tailored resume draft as text for review.

## Autopilot Workflow

- Search every morning for SWE/MLE opportunities, ranking top tech and elite engineering companies first, then late-stage companies, then smaller companies and startups.
- Shortlist jobs by company tier, role fit, location practicality, deadline, and resume match score.
- Ask for approval before tailoring materials for a role.
- Generate a one-page resume draft and one-page cover letter for approved roles.
- Preview generated materials before any form filling.
- Submit only after explicit approval for that exact role, resume, cover letter, and application package.

## Privacy Model

- Do not commit your real resume to GitHub.
- Private local resume paths are ignored through `.gitignore`: `private/`, `resumes/private/`, `resume.tex`, `*.private.tex`, and `*.resume.tex`.
- Browser imports stay in the browser unless you manually paste or commit content somewhere else.
- Local private reference notes can live under `private/` and remain ignored by Git.
- Tailoring should aggressively emphasize truthful evidence, but it should not fabricate employers, titles, degrees, dates, metrics, or projects.
- Resume bullets should use Action + Task + Result and remain concise enough for one page.
- Cover letters should stay one page and use Times New Roman or Calibri at 10-12 pt when exported into a document.

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Project Structure

- `src/App.tsx` - main React interface and application tracker.
- `src/lib/analyzer.ts` - deterministic resume and job-description analysis engine.
- `src/lib/latex.ts` - LaTeX resume parsing helper.
- `src/data/sample.ts` - sample profile and job description.
- `src/styles.css` - responsive operational UI styles.

## Roadmap

- Add job-board search ingestion and saved search criteria.
- Add daily shortlist review and application queue automation.
- Add resume-to-LaTeX export for tailored one-page resumes.
- Add PDF resume parsing in the browser.
- Add cover letter and recruiter-message variants with approval gates.
- Add interview preparation cards from the job description.
- Add backend persistence and authentication when the local MVP stabilizes.
- Add optional LLM integration for higher-quality tailoring with explicit user review.
