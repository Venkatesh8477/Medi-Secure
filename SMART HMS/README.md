# Hospital Management System

React and Express hospital-management application using MongoDB/Mongoose, JWT authentication, and role-based dashboards. This repository is a development project; review security, privacy, and clinical requirements before production use.

## 🌟 Features

### Security
- Bcrypt password hashing for new accounts, with legacy password hashes upgraded after successful login
- JWT authentication and role-based middleware
- JWT signing and verification require the same configured `JWT_SECRET`
- This implementation does not use Zero-Knowledge Proof authentication

### Hospital Management
- 👨‍⚕️ **Doctor Dashboard** - Patient management, diagnoses, prescriptions
- 👨‍⚕️ **Nurse Dashboard** - Vital signs, medication logs, progress notes
- 💊 **Pharmacist Dashboard** - Medication inventory and prescription dispensing
- 🔬 **Lab Technician Dashboard** - Lab requests and results management
- 👥 **Receptionist Dashboard** - Patient registration and appointments
- 👨‍💼 **Admin Dashboard** - User management, reports, audit logs
- 🧑‍🤝‍🧑 **Patient Portal** - View records, appointments, prescriptions

### Database
- 14 optimized tables with proper relationships
- Audit logging for compliance
- Support for documents and attachments
- Comprehensive vital signs tracking
- Medication administration logs

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                         │
│  (Login → Register → Dashboard by Role)                 │
└──────────────────┬──────────────────────────────────────┘
┌──────────────────V──────────────────────────────────────┐
│           Express.js REST API (Node.js)                │
│  • Authentication endpoints (register, login, current) │
│  • Hospital features (doctors, patients, pharmacy)     │
│  • Role-based middleware                               │
└──────────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │      MongoDB Database        │
    │  • Mongoose models           │
    │  • Patient medical records   │
    │  • Appointments & diagnoses  │
    │  • Prescriptions & medicines │
    │  • Audit logs                │
    └──────────────────────────────┘
```

---

## Authentication

The login API receives the password over the application connection and stores a bcrypt hash. Existing legacy hashes are checked at login and upgraded on successful authentication. Use HTTPS in deployed environments. The application does not implement ZKP authentication, and this README makes no compliance certification claim.
New passwords must be at least 12 characters and no more than 72 UTF-8 bytes.

## AI Prescription Intelligence

The Doctor Dashboard supports Single-Agent or Multi-Agent analysis through Gemini, Ollama Cloud, or both providers for comparison. PDF text extraction and PNG/JPEG OCR run on the backend. DailyMed drug-label references are retrieved separately and shown with their source URLs. Results are unverified decision support: an authorized doctor must review them; the system does not approve or change treatment.

The feature is disabled unless `AI_PRESCRIPTION_ANALYSIS_ENABLED=true` and `AI_EXTERNAL_DATA_SHARING_APPROVED=true` are set in the backend environment. Enable external sharing only after your organization has approved the relevant patient-data sharing, consent, and retention arrangements. Set provider API keys in the backend environment only.

## Patient AI Assistant

The patient portal includes a separate AI assistant with patient-owned conversations, English/Telugu responses, emergency and medication-change guardrails, prescription OCR, medicine-label lookup through DailyMed, and optional source-grounded health answers.

The patient AI module is disabled unless both `PATIENT_AI_ENABLED=true` and `PATIENT_AI_EXTERNAL_DATA_SHARING_APPROVED=true` are explicitly set. This patient-specific approval is independent of the doctor prescription-analysis flags. The patient assistant never sends the patient's chart or uploaded original prescription to the model. Prescription files are processed in memory; only extracted medicine fields, uncertainty notes, and source references are retained with the patient's conversation.

General health RAG requires `OLLAMA_EMBEDDING_MODEL` and an admin-curated corpus. The application stores text chunks and embeddings in MongoDB and currently ranks them with in-process cosine similarity; it does not require Atlas Vector Search, but this approach is intended for a small corpus. Only HTTPS sources whose host matches `PATIENT_AI_RAG_ALLOWED_DOMAINS` may be ingested. Source content must be reviewed before ingestion. An admin can ingest a reviewed source using `POST /api/patient-ai/admin/knowledge` with `{ "title": "...", "sourceUrl": "https://medlineplus.gov/...", "content": "..." }`.

Patient routes include `POST /api/patient-ai/chat`, `POST /api/patient-ai/prescription/analyze`, `GET /api/patient-ai/medicine/:name`, conversation history/deletion, and `POST /api/patient-ai/doctor-handoff`. Patient records are scoped to the authenticated patient's own profile. The assistant does not provide diagnoses, prescribe, validate drug interactions, or recommend medication changes. It is not a substitute for clinical review.

---

## 📋 User Roles and Permissions

| Role | Register | Patients | Diagnose | Prescribe | Pharmacy | Lab | Reports |
|------|----------|----------|----------|-----------|----------|-----|---------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Doctor** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Nurse** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Pharmacist** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Lab Tech** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Receptionist** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Patient** | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ✅* |

*Own data only

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or hosted)

### Local development

1. In `SMART HMS\backend`, copy `.env.example` to `.env`.
2. Set `MONGO_URI` and a unique random `JWT_SECRET` of at least 32 characters.
3. Install dependencies and start the API with `npm install` and `npm start`.
4. In a separate terminal, enter `SMART HMS\frontend`, run `npm install` and `npm start`.
5. The backend health endpoint is `http://localhost:5000/api/health`; the frontend normally runs at `http://localhost:3000`.

The prescription-analysis feature stays disabled until both feature flags in the backend `.env` are explicitly enabled and a provider key/model is configured. Do not commit `.env` or paste API keys into source files.

---

## 📁 File Structure

```
backend/
├── config/
│   └── database.js                 # MongoDB/Mongoose connection
├── models/                         # Mongoose schemas
├── services/
│   └── prescriptionAnalysis/       # Provider, orchestration, evidence, validation
├── controllers/
│   ├── authController.js           # Authentication logic
│   ├── patientController.js        # Patient management
│   └── doctorController.js         # Doctor operations
├── routes/
│   ├── authRoutes.js               # /api/auth endpoints
│   ├── comprehensiveRoutes.js       # Role and hospital endpoints
│   └── doctorPrescriptionAnalysisRoutes.js
├── middleware/
│   └── authMiddleware.js           # JWT & RBAC middleware
├── package.json
├── .env                            # Configuration
└── server.js                       # Main server

frontend/
├── src/
│   ├── services/
│   │   ├── api.js                  # Axios HTTP client
│   │   └── loginService.js         # Login and registration
│   ├── components/
│   │   ├── LoginPage.jsx           # Login interface
│   │   ├── RegisterPage.jsx        # Registration interface
│   │   ├── ProtectedRoute.jsx      # Route protection
│   │   └── Auth.css                # Auth styling
│   ├── pages/
│   │   ├── DashboardPage.jsx       # Main dashboard
│   │   └── Dashboard.css           # Dashboard styling
│   ├── App.jsx                     # Main component
│   ├── App.css                     # App styling
│   └── index.jsx                   # Entry point
├── public/
│   └── index.html                  # HTML template
└── package.json
```

---

## 🔗 API Endpoints

### Authentication

```http
POST /api/auth/register
{
  "username": "dr_smith",
  "email": "dr.smith@hospital.com",
  "password": "SecurePass@2025",
  "role": "doctor",
  "firstName": "John",
  "lastName": "Smith"
}
Response: { success: true, user: {...} }

---

POST /api/auth/login
{ "username": "dr_smith", "password": "..." }
Response: { success: true, token: "...", user: {...} }

---

GET /api/auth/me
Authorization: Bearer <token>
Response: { success: true, user: {...} }

---

GET /api/auth/me
Headers: { Authorization: "Bearer <token>" }
Response: { success: true, user: {...} }
```

### Hospital Features

```http
# Patients
GET /api/patients                              # List all (doctor, admin, nurse)
POST /api/patients/register                    # Create (receptionist, admin)
GET /api/patients/:patientId                   # Get details
GET /api/patients/:patientId/records           # Get medical records

# Doctor Operations
GET /api/doctor/patients                       # Doctor's patients
POST /api/doctor/diagnosis                     # Add diagnosis
POST /api/doctor/prescription                  # Create prescription
GET /api/doctor/profile                        # Doctor profile
GET /api/doctor/slots?date=YYYY-MM-DD         # Available time slots
```

---

## MongoDB data

The backend uses Mongoose models for users, role profiles, appointments, diagnoses, prescriptions, medications, patient documents, audit events, and prescription analyses. `backend/database/schema.sql` is a legacy MySQL artifact and is not the schema used by the running Express server.

## Doctor prescription-analysis API

These endpoints are mounted under `/api/doctor/prescription-analysis` and require a doctor JWT. Start analysis with `POST /` using multipart fields `patientId`, `agentMode` (`single` or `multi`), and `provider` (`gemini`, `ollama`, or `both`), plus either `prescriptionId` or a PDF/PNG/JPEG `file`. Results, provider comparison, agent results, doctor review, and prescription history are available from the corresponding `/:id`, `/:id/comparison`, `/:id/agents`, `/:id/review`, and `/history/:prescriptionId` routes.

---

## 🧪 Test Scenarios

### Scenario 1: Doctor Logs In
```
1. Go to http://localhost:3000/login
2. Username: dr_smith, Password: SecurePass@2025
3. Click "Sign In"
4. The backend verifies the password and returns a JWT
5. Dashboard shows doctor's patients
```

### Scenario 2: Patient Views Records
```
1. Register as patient
2. After login, patient portal shows:
   - Medical records
   - Appointments
   - Prescriptions
   - Download documents
```

### Scenario 3: Admin Manages Users
```
1. Login as admin
2. Access user management
3. Create new staff users
4. Assign roles and departments
5. View audit logs
```

---

## ⚙️ Configuration (.env)

```env
# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/hospital_management_system

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
TOKEN_EXPIRY=24h

# Prescription analysis: leave disabled until explicitly approved
AI_PRESCRIPTION_ANALYSIS_ENABLED=false
AI_EXTERNAL_DATA_SHARING_APPROVED=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OLLAMA_API_KEY=
OLLAMA_MODEL=
OLLAMA_BASE_URL=https://ollama.com/api
```

---

## 🔒 Security Features

### Authentication
- Bcrypt password hashes (legacy hashes upgraded on successful login)
- JWT session tokens require an explicitly configured secret
- Passwords are sent to the backend for verification; this is not ZKP authentication

### Authorization
- Role-based access control and protected API routes
- Prescription-analysis access checks the doctor/patient appointment and selected prescription

### Data Protection
- Analysis uploads are processed in memory and are not persisted as source files by the analysis route
- External provider calls require explicit server-side feature and data-sharing flags
- Deploy behind HTTPS and configure data retention and access controls

### Compliance
- Analysis start, result access, and doctor review create audit events
- The project is not certified as HIPAA compliant; perform legal, privacy, and security review before production

---

## 🐛 Troubleshooting

### Backend won't start
```
Error: connect ECONNREFUSED
Solution: MongoDB is not reachable at MONGO_URI
  Start MongoDB or set MONGO_URI to the correct deployment
```

### Login fails because authentication is not configured
```
Set JWT_SECRET in backend/.env to a random value at least 32 characters long,
then restart the backend.
```

### CORS errors in browser
```
Error: Access to XMLHttpRequest blocked
Solution: CORS already enabled in backend
  Ensure frontend proxy in package.json points to backend
  Check both servers are running
```

### npm install fails
```
Error: ERR! code ERESOLVE
Solution: Clear npm cache and try again
  npm cache clean --force
  rm -r node_modules package-lock.json
  npm install
```

---

## Performance and clinical validation

No clinical accuracy or production-capacity benchmark is currently certified. Validate the analysis feature with a clinician-reviewed test set, exercise provider failures and authorization boundaries, and perform load testing before deployment.

---

## 🚀 Production Deployment

### Checklist
- [ ] Update JWT_SECRET to strong random value
- [ ] Set NODE_ENV=production
- [ ] Use strong DB password
- [ ] Enable HTTPS/SSL certificates
- [ ] Setup reverse proxy (Nginx)
- [ ] Configure firewall rules
- [ ] Enable automated backups
- [ ] Monitor server logs
- [ ] Setup monitoring/alerting
- [ ] Test all role workflows

### Deployment Options
- **Backend:** Heroku, AWS EC2, DigitalOcean, Azure
- **Frontend:** Vercel, Netlify, AWS S3 + CloudFront
- **Database:** AWS RDS, Azure Database, DigitalOcean Managed

---

## 📚 Documentation

- `COMPLETE_SETUP_GUIDE.md` - Detailed setup instructions
- Older ZKP documents describe a proposed design and do not match the current runtime implementation.
- `Hospital_Management_System_Architecture.md` - System architecture
- API documentation in route files

---

## 🤝 Contributing

For customization:
1. Fork the repository
2. Create feature branch
3. Submit pull request

---

## 📝 License

All rights reserved - Hospital Management System

---

## Project status

The backend tests and frontend production build are the available automated checks. They do not establish clinical correctness, full end-to-end coverage, production readiness, or regulatory compliance.

---

## 🎓 Learning Resources

- **Legacy ZKP concept documents:** These are design notes, not a description of the current login implementation.
- **Architecture:** See `Hospital_Management_System_Architecture.md`
- **API Integration:** Check route files for endpoint details
- **Frontend Logic:** Review component files for implementation patterns

---

Use the local-development instructions above, then validate the workflows and security controls required by your deployment.

For questions or issues, refer to COMPLETE_SETUP_GUIDE.md
