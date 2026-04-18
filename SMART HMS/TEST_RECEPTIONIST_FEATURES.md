# ✅ HOW TO TEST THE 2 MAIN RECEPTIONIST FEATURES

## Feature 1: Patient Registration (Receptionist)
## Feature 2: Book Appointment (Receptionist)

---

## 🔧 SETUP

Make sure both servers are running:

**Terminal 1 - Backend:**
```bash
cd c:\Users\nbhar\SMART HMS\backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd c:\Users\nbhar\SMART HMS\frontend
npm start
```

---

## 🧪 TEST FEATURE 1: PATIENT REGISTRATION

### Step 1: Login as Receptionist
- **URL**: http://localhost:3000
- **Username**: `receptionist_priya`
- **Password**: `Receptionist@123`
- **Click**: Login

### Step 2: Go to "Register Patient" Tab
- Click the **"Register Patient"** tab on the dashboard

### Step 3: Fill in Patient Form
```
First Name:        John
Last Name:         Smith
Email:             john.smith@email.com
Phone:             555-1234
Gender:            Male
Blood Group:       O+
Address:           123 Main Street
City:              New York
Postal Code:       10001
Medical History:   Hypertension
Allergies:         Penicillin
Emergency Contact: Jane Smith
```

### Step 4: Submit Form
- Click **"Register Patient"** button
- You should see: ✅ Patient registered! With username and password

### Expected Result:
```
✅ Patient registered!
Username: patient_XXXXXXX
Password: Temp@XXXXXXX
```

**The receptionist has REGISTERED a new patient!** ✔️

---

## 🧪 TEST FEATURE 2: BOOK APPOINTMENT

### Step 1: Login as Receptionist (if not already)
- **Username**: `receptionist_priya`
- **Password**: `Receptionist@123`

### Step 2: Go to "Book Appointment" Tab
- Click the **"Book Appointment"** tab on the dashboard

### Step 3: Select Patient and Doctor
- **Select Patient**: Choose any patient from dropdown (e.g., "James Wilson")
- **Select Doctor**: Choose any doctor from dropdown (e.g., "Robert Smith - Cardiology")

### Step 4: Set Appointment Details
```
Date & Time:       2025-11-25 10:00 (pick any future date/time)
Reason:            General Checkup
```

### Step 5: Submit Form
- Click **"Book Appointment"** button
- You should see: ✅ Appointment booked successfully!

### Expected Result:
```
✅ Appointment booked successfully!
```

**The receptionist has BOOKED an appointment!** ✔️

---

## 📊 API ENDPOINTS BEING USED

### For Patient Registration:
```
POST /api/receptionist/patients/register
```

### For Getting Patients & Doctors:
```
GET /api/receptionist/patients
GET /api/receptionist/doctors/available
```

### For Booking Appointment:
```
POST /api/receptionist/appointments/book
```

---

## ❌ TROUBLESHOOTING

### Issue: Patient dropdown shows 0 patients
**Solution**: 
- Check browser console (F12) for errors
- Verify backend is running on port 5000
- Check network tab to see API response

### Issue: Can't select from dropdown
**Solution**:
- Make sure patients array is not empty
- Try refreshing the page (F5)
- Check if data loaded (should see numbers next to dropdown)

### Issue: Appointment booking fails
**Solution**:
- Make sure both patient and doctor are selected
- Check that appointment date is in future
- Check browser console for error message

---

## ✅ SUCCESS CHECKLIST

- [ ] Patient Registration Form displays correctly
- [ ] Can fill in all patient fields
- [ ] Submit button creates new patient
- [ ] Success message appears with credentials

- [ ] Book Appointment tab shows patient dropdown with >0 patients
- [ ] Book Appointment tab shows doctor dropdown with >0 doctors
- [ ] Can select a patient
- [ ] Can select a doctor
- [ ] Can set appointment date/time and reason
- [ ] Can submit and see success message

**If all ✓, then BOTH FEATURES ARE WORKING!** 🎉

