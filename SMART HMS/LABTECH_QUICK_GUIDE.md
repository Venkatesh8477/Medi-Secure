# Lab Technician Dashboard - Quick Reference Guide

## 🚀 Getting Started

### Access the Dashboard
1. **Login**: Go to `http://localhost:3000`
2. **Credentials**: Use your lab technician account
3. **Redirect**: You'll be automatically sent to `/lab-technician`

---

## 📱 Dashboard Overview

### 5 Main Sections:

```
┌─────────────────────────────────────────────────────────┐
│  LAB TECHNICIAN DASHBOARD                          [X]  │
├─────────────────────────────────────────────────────────┤
│ [Dashboard] [Collect Sample] [Samples] [Tests] [Reports]│
├─────────────────────────────────────────────────────────┤
│                    CONTENT AREA                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Tab 1: Dashboard

**What you see:**
- 4 statistics cards
- Quick action buttons

**Statistics displayed:**
- Total Samples
- Collected Samples  
- Pending Tests
- Completed Tests

**Quick Actions:**
- 🆕 Collect Sample → Goes to Tab 2
- 📋 View Requests → Goes to Tab 4
- 📝 Upload Report → Goes to Tab 5

---

## 🧪 Tab 2: Collect Sample

**Step-by-step:**

1. **Select Patient**
   - Click dropdown
   - Choose from available patients
   - Patient list auto-loads

2. **Choose Sample Type**
   - Blood
   - Urine
   - Stool
   - Saliva
   - Tissue
   - Other

3. **Set Collection Date**
   - Click date picker
   - Select today's date or past date

4. **Add Notes (Optional)**
   - E.g., "Fasting sample", "First draw", etc.

5. **Click "Collect Sample"**
   - Success message appears
   - Sample saved to database
   - Auto-refreshes "Samples" tab

---

## 📋 Tab 3: Samples

**What you see:**
- Table of all collected samples
- Patient name, sample type, date, status

**Each row has:**
- Patient Name
- Sample Type (blood, urine, etc.)
- Collection Date
- Current Status (badge)
- Notes
- Status Dropdown

**Update Sample Status:**
1. Find the sample in the table
2. Click status dropdown in that row
3. Select new status:
   - **Pending** - Not yet collected
   - **Collected** - Sample received
   - **Processing** - Being analyzed
   - **Analyzed** - Test complete
4. Status updates immediately

**Color Coding:**
- 🟡 Pending (Yellow)
- 🟢 Collected (Green)
- 🔵 Processing (Blue)
- 🩵 Analyzed (Cyan)

---

## 🏥 Tab 4: Test Requests

**What you see:**
- Table of test requests from doctors
- Patient info, test type, doctor name

**Each request shows:**
- Patient Name
- Doctor Name
- Test Type
- Request Date
- Status Badge
- Upload Button

**To upload a report:**
1. Find the test request
2. Click the "Upload Report" button
3. Gets redirected to Tab 5 with test pre-selected

---

## 📄 Tab 5: Upload Report

**For Test Requests:**
- Automatically shows selected test info
- Patient & doctor names pre-filled
- Request date displayed

**Form Fields to Complete:**

| Field | Type | Example |
|-------|------|---------|
| Test Name | Text | "Blood Glucose" |
| Result | Number | "120" |
| Unit | Dropdown | "mg/dL" |
| Reference Range | Text | "70-100" |
| Status | Dropdown | "Abnormal" |
| Remarks | Text | "Slightly elevated" |
| Report File | File | result.pdf |

**Status Options:**
- **Normal** (Green) - Within range
- **Abnormal** (Yellow) - Outside range
- **Critical** (Red) - Requires attention

**File Upload:**
1. Click file input or drag file
2. Allowed: PDF, DOC, DOCX, XLSX, JPG, PNG
3. Max size: 10 MB
4. Click "Upload Report"
5. Success message confirms upload

---

## 🔄 Auto-Refresh Feature

- **Dashboard updates every 30 seconds**
- Statistics automatically recalculate
- New samples appear in list
- Status updates reflected

---

## ⚠️ Status Indicators

### Sample Status (Color coded)
```
Pending   → Yellow background
Collected → Green background  
Processing → Blue background
Analyzed  → Cyan background
```

### Result Status (Color coded)
```
Normal    → Green
Abnormal  → Yellow
Critical  → Red
```

---

## 🎯 Common Workflows

### Workflow 1: New Sample Arrives
```
1. Go to "Collect Sample" tab
2. Select patient
3. Choose sample type (e.g., Blood)
4. Set collection date
5. Add notes if needed
6. Click "Collect Sample"
7. Confirm success message
8. New sample appears in "Samples" tab
```

### Workflow 2: Process Sample
```
1. Go to "Samples" tab
2. Find sample you're processing
3. Click status dropdown
4. Select "Processing"
5. Status updates immediately
```

### Workflow 3: Complete Test & Upload Report
```
1. Receive test request from doctor
2. Go to "Test Requests" tab
3. Find the test you completed
4. Click "Upload Report" button
5. Fill in test details:
   - Test name
   - Result value
   - Unit
   - Reference range
   - Status (Normal/Abnormal/Critical)
   - Remarks
6. Attach report file (PDF recommended)
7. Click "Upload Report"
8. Confirm success message
9. Report saved with timestamp
10. Doctor notified (optional feature)
```

---

## 💾 Data That Gets Saved

### When Collecting Sample:
- Patient ID
- Sample type
- Collection date
- Notes
- Who collected it (your user ID)
- Timestamp

### When Uploading Report:
- Test request ID
- Test name & result
- Unit & reference range
- Status (normal/abnormal/critical)
- Remarks
- Report file path
- Who uploaded it (your user ID)
- Upload timestamp

---

## 🔐 Security Notes

- ✅ You must be logged in
- ✅ Only lab technicians can access
- ✅ Authentication token required for API calls
- ✅ File uploads scanned for security
- ✅ All data encrypted in transit

---

## 🐛 Common Issues & Solutions

### Issue: Can't select patient
**Solution**: Make sure patients are registered in the system. Go to Receptionist Dashboard to add patients if needed.

### Issue: Sample not appearing in list
**Solution**: Wait 30 seconds for auto-refresh or click refresh button. Check success message was shown.

### Issue: File upload failed
**Solution**: 
- Check file size < 10 MB
- Use allowed format (PDF, DOC, XLSX, JPG, PNG)
- Check internet connection

### Issue: Status not updating
**Solution**: Try again or refresh page. Check backend logs if issue persists.

### Issue: Statistics not updating
**Solution**: Wait for 30-second auto-refresh or manually refresh page.

---

## 📞 Need Help?

**Check these first:**
1. Are you logged in?
2. Is your role "lab_technician"?
3. Is the backend running on port 5000?
4. Is the frontend running on port 3000?
5. Are the database tables created? (Run: `node scripts/runMigrations.js`)

**If still stuck:**
- Check browser console (F12 > Console)
- Check backend logs
- Verify database connection
- Try refreshing the page
- Try logging out and back in

---

## 🎓 Tips & Tricks

✨ **Tip 1**: Use the Dashboard tab to quickly see your workload statistics

✨ **Tip 2**: Set sample status to "Analyzed" when testing complete

✨ **Tip 3**: Add descriptive remarks to help doctors understand results

✨ **Tip 4**: Always attach the report file (PDF works best)

✨ **Tip 5**: Use consistent test names for better tracking

✨ **Tip 6**: Refresh page if numbers seem off

✨ **Tip 7**: Check email for test requests (if enabled)

---

## 📈 Next Steps

1. **Start Using Dashboard**
   - Collect a test sample
   - Update its status through workflow
   - Complete a test report

2. **Provide Feedback**
   - What's working well?
   - What could be improved?
   - Any features needed?

3. **Advanced Features** (Coming soon)
   - Barcode scanning
   - Batch report uploads
   - Email notifications
   - Advanced analytics

---

## 🎉 You're Ready!

Your Lab Technician Dashboard is fully set up and ready to use. Start by collecting a sample or uploading a test report. 

**Questions?** Contact your system administrator.

---

*Last Updated: 2025-11-24*
*Version: 1.0 - Production Ready*
