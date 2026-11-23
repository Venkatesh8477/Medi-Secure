# CareCheck AI setup

CareCheck keeps the existing doctor endpoint and defaults requests to single-agent mode. Send `{"mode":"multi"}` to run physician, internal medicine, and medication review agents in parallel, then consolidate their results with a supervisor. A failed agent fails the multi-agent request; it is never returned as a complete result.

The API sends a de-identified clinical summary to Ollama Cloud. It includes age instead of date of birth, relative record recency instead of exact dates, and omits patient contact details and names. Free-text fields are scrubbed for common names, email addresses, phone numbers, and date formats. Review this data handling against your organization’s policy before using real patient records.

All output is AI-generated decision support for a doctor to review. The medication agent has no drug reference database and must not present interaction claims as verified. Token counts are shown only when Ollama returns them; estimated cost is left unavailable because pricing is not configured. Text overlap is an agreement signal only, not a measure of clinical correctness.

## Environment

Copy `backend/.env.example` to `backend/.env` and set:

- `OLLAMA_API_KEY`: Ollama Cloud API key.
- `OLLAMA_MODEL`: model available to that key.
- `OLLAMA_BASE_URL`: optional; defaults to `https://ollama.com/api`.
- `OLLAMA_TIMEOUT_MS`: optional request timeout; defaults to 45000.

The backend also needs its existing `MONGO_URI` and a strong `JWT_SECRET`. `AI_ENABLED=true` controls the patient prescription upload analysis route; the doctor CareCheck endpoint is controlled by Ollama configuration.

## Windows startup

In separate terminals, from `SMART HMS`:

```powershell
cd backend
npm install
npm start
```

```powershell
cd frontend
npm install
npm start
```

Automated mocked tests are in `backend/services/carecheck/__tests__/carecheck.test.js`. Run them from `backend` with `npm test -- --runInBand`. They do not call Ollama.
