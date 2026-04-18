# Lab Technician Dashboard Implementation

## Overview
Complete lab technician dashboard system with sample collection tracking and test report uploads.

## Features Implemented

### Frontend (`frontend/src/pages/LabTechnician/LabTechnicianDashboard.jsx`)

#### 5 Main Tabs:

1. **Dashboard**
   - Statistics cards showing:
     - Total samples collected
     - Pending tests
     - Completed tests
   - Quick action buttons
   - Real-time data refresh (30 seconds)

2. **Collect Sample**
   - Form to register new patient sample collection
   - Fields:
     - Patient selection (dropdown)
     - Sample type (blood, urine, stool, saliva, tissue, other)
     - Collection date picker
     - Notes/remarks

3. **Samples**
   - Table view of all collected samples
   - Displays: Patient name, sample type, collection date, status
   - Status update dropdown (pending → collected → processing → analyzed)
   - Color-coded status badges

4. **Test Requests**
   - Table of test requests from doctors
   - Shows: Patient name, doctor name, test type, request date, status
   - Quick upload button for each test

5. **Upload Report**
   - Comprehensive test result form
   - Fields:
     - Test name
     - Result value & unit
     - Reference range
     - Status (normal, abnormal, critical)
     - Remarks
     - File upload (.pdf, .doc, .docx, .xlsx, .jpg, .png)
   - FormData support for multipart file uploads

### Backend API Endpoints (`backend/routes/labTechnicianRoutes.js`)

All endpoints require authentication and `lab_technician` role.

#### Sample Management:
- **GET** `/api/lab-technician/samples` - Get all collected samples
- **POST** `/api/lab-technician/samples/collect` - Record new sample collection
- **PUT** `/api/lab-technician/samples/:id/status` - Update sample status

#### Test Requests:
- **GET** `/api/lab-technician/test-requests` - Get all test requests from doctors
- **POST** `/api/lab-technician/test-requests/upload-report` - Upload test report with file

#### Utilities:
- **GET** `/api/lab-technician/patients` - Get patient list (for dropdown)

#### Legacy Endpoints (backward compatible):
- **GET** `/api/lab-technician/requests` - Get lab requests
- **PUT** `/api/lab-technician/requests/:id/status` - Update request status
- **POST** `/api/lab-technician/requests/:id/results` - Upload results
- **GET** `/api/lab-technician/dashboard/stats` - Get dashboard statistics

### Database Tables

#### patient_samples
```sql
- id (PK)
- patient_id (FK)
- sample_type (blood, urine, stool, saliva, tissue, other)
- collection_date
- status (pending, collected, processing, analyzed)
- notes
- collected_by_id (FK - users)
- created_at, updated_at
```

#### test_results
```sql
- id (PK)
- lab_request_id (FK)
- test_name
- result
- reference_range
- unit
- status (normal, abnormal, critical)
- remarks
- report_file (path to uploaded file)
- uploaded_by_id (FK - users)
- uploaded_date
```

## Installation & Setup

### 1. Run Database Migrations
```bash
cd backend
node scripts/runMigrations.js
```

This creates:
- `patient_samples` table
- `test_results` table
- Necessary indexes and foreign keys

### 2. Create Upload Directory
The script automatically creates:
- `backend/uploads/lab-reports/` - for storing uploaded test reports

### 3. Restart Backend Server
```bash
npm start
```

### 4. Frontend Already Configured
The lab technician dashboard is already integrated:
- Route: `/lab-technician`
- Protected by role-based routing (requires `lab_technician` role)
- Automatically appears after lab technician login

## API Usage Examples

### Collect Sample
```bash
POST /api/lab-technician/samples/collect
Content-Type: application/json

{
  "patientId": 1,
  "sampleType": "blood",
  "collectionDate": "2025-11-24",
  "notes": "Fasting blood sample"
}
```

### Update Sample Status
```bash
PUT /api/lab-technician/samples/1/status
Content-Type: application/json

{
  "status": "processing"
}
```

### Upload Test Report
```bash
POST /api/lab-technician/test-requests/upload-report
Content-Type: multipart/form-data

FormData:
- testRequestId: 1
- testName: "Blood Glucose"
- result: "120"
- unit: "mg/dL"
- referenceRange: "70-100"
- status: "abnormal"
- remarks: "Slightly elevated"
- reportFile: <binary file>
```

### Get Samples
```bash
GET /api/lab-technician/samples
```

Response:
```json
{
  "success": true,
  "samples": [
    {
      "id": 1,
      "patient_id": 1,
      "patient_name": "John Doe",
      "sample_type": "blood",
      "collection_date": "2025-11-24",
      "status": "collected",
      "notes": "Fasting sample"
    }
  ]
}
```

## File Upload Configuration

- **Destination**: `backend/uploads/lab-reports/`
- **Max File Size**: 10MB
- **Allowed Formats**:
  - Documents: PDF, DOC, DOCX, XLSX
  - Images: JPG, PNG

Files are stored with their upload timestamp and can be accessed via the file path returned in the `test_results` table.

## Features

✅ Patient sample collection tracking
✅ Real-time status updates
✅ Test report uploads with file storage
✅ Test result management
✅ Doctor test request view
✅ Auto-refresh (30 seconds)
✅ Error handling & validation
✅ Success/error notifications
✅ Professional UI with status badges
✅ Responsive design
✅ Role-based access control

## Testing

1. **Login as Lab Technician**
   - Username: lab technician credentials
   - Role will redirect to `/lab-technician`

2. **Test Sample Collection**
   - Go to "Collect Sample" tab
   - Select patient, sample type, date
   - Click "Collect Sample"
   - Verify in "Samples" tab

3. **Test Report Upload**
   - Go to "Test Requests" tab
   - Click upload button on a request
   - Fill in test details
   - Upload a PDF file
   - Verify success message

4. **Monitor Statistics**
   - Dashboard updates every 30 seconds
   - Stats show total, collected, pending, completed

## Troubleshooting

**Issue**: File upload fails
- Check `uploads/lab-reports/` directory exists
- Verify file size < 10MB
- Check allowed file types

**Issue**: Sample status not updating
- Verify sample ID exists
- Check network request in browser console
- Verify authentication token valid

**Issue**: Statistics not showing
- Wait 30 seconds for auto-refresh
- Check browser console for errors
- Verify database tables were created

**Issue**: Cannot select patient in form
- Verify patients exist in database
- Check `/api/lab-technician/patients` endpoint returns data
- Verify authentication token is valid

## Architecture

```
Lab Technician Dashboard
├── Frontend
│   ├── LabTechnicianDashboard.jsx (480+ lines)
│   └── LabTechnicianDashboard.css (600+ lines)
├── Backend Routes
│   └── labTechnicianRoutes.js (comprehensive endpoints)
├── Database
│   ├── patient_samples (new)
│   ├── test_results (new)
│   └── lab_requests (existing)
└── File Storage
    └── uploads/lab-reports/
```

## Next Steps

1. **Email Notifications**: Send email to doctor when report uploaded
2. **Report Generation**: Create PDF from form data
3. **Barcode Scanning**: Scan sample barcodes for quick collection
4. **Quality Control**: Add validation checks for test values
5. **Analytics Dashboard**: Track sample processing times

## Support

For issues or questions, check the API response status and error messages. All endpoints return JSON with `success` flag and descriptive error messages.
