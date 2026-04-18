# 🚀 Receptionist Dashboard - Quick Start Guide

## Login Information

**Receptionist Account:**
```
Username: receptionist_priya
Password: Receptionist@123
```

## Access the Dashboard

1. Navigate to: **http://localhost:3001** (or http://localhost:3000)
2. Enter receptionist credentials above
3. You'll be automatically routed to the Receptionist Dashboard

## What You Can Do

### 1. Dashboard Tab 📊
- View statistics at a glance
- See total patients, appointments, doctors
- See active staff absences
- Quick action buttons to main functions

### 2. Register Patient 📝
**Steps:**
1. Click "📝 Register Patient" tab
2. Fill personal info (First/Last name, age required)
3. Enter medical info (optional but recommended)
4. Add address details (optional)
5. Click "✅ Register Patient"
6. **You'll see:** Auto-generated username & password for the patient

**Example Patient:**
- Name: John Doe
- Age: 35
- Email: john@example.com
- Blood Group: O+
- Note: Share credentials with patient so they can login

### 3. Book Appointment 📅
**Steps:**
1. Click "📅 Book Appointment" tab
2. Select a patient from dropdown
3. Select a doctor and see their specialization
4. Pick appointment date & time
5. Enter reason for visit
6. Click "✅ Book Appointment"

**Example Appointment:**
- Patient: John Doe
- Doctor: Dr. Rajesh Kumar (Cardiology)
- Date/Time: Tomorrow at 10:00 AM
- Reason: General Checkup

### 4. Mark Staff Absence ⚠️
**Steps:**
1. Click "⚠️ Mark Absence" tab
2. Select staff member (doctor, nurse, pharmacist, etc.)
3. Choose absence type:
   - Leave (vacation/planned)
   - Sick (medical reason)
   - Emergency (urgent)
   - Training (professional dev)
   - Other
4. Set start and end dates
5. Add reason (optional)
6. Click "✅ Mark Absence"

**Example Absence:**
- Staff: Dr. Rajesh Kumar
- Type: Leave
- Dates: Nov 25 - Nov 27, 2025
- Reason: Family vacation

### 5. View All Patients 👥
**Steps:**
1. Click "👥 Patients" tab
2. See all registered patients
3. View: Name, Age, Gender, Blood Group, Phone, Email

**You'll see:**
- All patient details in a table
- Patients sorted by registration date
- Can view up to 100+ patients

### 6. View All Appointments 📋
**Steps:**
1. Click "📋 Appointments" tab
2. See all scheduled appointments
3. Check patient, doctor, date/time, reason, status

**Status Colors:**
- 🟢 Scheduled (Green) - Upcoming
- 🔵 Completed (Blue) - Done
- 🔴 Cancelled (Red) - Cancelled

### 7. View Staff Absences 📅
**Steps:**
1. Click "📅 Staff Absences" tab
2. See all current staff absences
3. View staff name, department, dates, reason

**Absence Type Colors:**
- 🟢 Leave (Green)
- 🔴 Sick (Red)
- 🟡 Emergency (Orange)
- 🔵 Training (Blue)

---

## 🎨 Dashboard Features

**Color-Coded Cards:**
- 👥 Blue - Patients
- 📅 Green - Appointments
- 👨‍⚕️ Red - Doctors
- 👔 Orange - Staff
- ⚠️ Orange - Absences

**Responsive Design:**
- Works on desktop, tablet, mobile
- Touch-friendly buttons
- Readable on all screen sizes
- Professional gradient design

**Real-time Updates:**
- Auto-refreshes every 30 seconds
- Data always current
- Live statistics

---

## ✅ Testing Checklist

**Test Patient Registration:**
- [ ] Fill form with test data
- [ ] See success message
- [ ] Note down patient credentials
- [ ] Try to login as that patient (test in another browser tab)

**Test Appointment Booking:**
- [ ] Select registered patient
- [ ] Select available doctor
- [ ] Pick future date/time
- [ ] See appointment in Appointments tab

**Test Staff Absence:**
- [ ] Select staff member
- [ ] Choose Leave type
- [ ] Set dates (today to next week)
- [ ] See it appear in Staff Absences tab

**Test View Tabs:**
- [ ] Patients tab shows all registered patients
- [ ] Appointments tab shows all bookings
- [ ] Staff Absences tab shows all marked absences

**Test Responsiveness:**
- [ ] Resize browser to tablet size (768px)
- [ ] Verify layout adapts
- [ ] Resize to mobile size (480px)
- [ ] Check mobile-friendly design

---

## 📊 Sample Test Data

**Test Patient:**
```
Name: Amit Kumar
Age: 28
Gender: Male
Email: amit.kumar@email.com
Phone: 9876543210
Blood Group: B+
Address: 123 Medical Lane
City: Delhi
Postal Code: 110001
```

**Test Appointment:**
```
Patient: Amit Kumar (after registering above)
Doctor: Dr. Priya Sharma (Gynecology)
Date: [Tomorrow's date]
Time: 14:00 (2:00 PM)
Reason: Regular Checkup
```

**Test Staff Absence:**
```
Staff: Dr. Rajesh Kumar
Type: Leave
Start: [Today's date]
End: [3 days from today]
Reason: Family vacation
```

---

## 🔍 What to Look For

✅ **Success Indicators:**
- Form submissions show green success messages
- Data appears immediately in tables
- Dashboard statistics update
- No error messages in browser console
- Smooth animations and transitions

⚠️ **Potential Issues:**
- Backend errors = Check console (F12)
- Empty dropdowns = Ensure data exists in system
- Failed submission = Check all required fields (*)
- Connection errors = Verify backend on port 5000

---

## 🆘 Quick Troubleshooting

**Issue: Seeing "Loading..." indefinitely**
- Check if backend server is running
- Open browser console (F12) to see errors
- Check network tab for failed requests

**Issue: Patient dropdown is empty**
- Ensure at least one patient is registered
- Try registering a test patient first

**Issue: Staff dropdown is empty**
- Check if doctor/nurse/staff accounts exist
- Verify they're marked as active

**Issue: Appointment not saving**
- Ensure patient is selected
- Ensure doctor is selected
- Ensure future date/time is selected
- Check browser console for validation errors

---

## 📱 Mobile Testing

**On Mobile (< 768px):**
- Buttons stack vertically
- Forms are single-column
- Tables scroll horizontally
- Touch targets are larger
- Font sizes are readable

**On Tablet (768px - 1024px):**
- Two-column layouts
- Readable tables
- Proper spacing
- Forms side-by-side where possible

---

## 🎯 Key Workflows

**Morning Workflow:**
1. Login with receptionist credentials
2. Check Dashboard for stats
3. View today's appointments
4. Mark any staff absences
5. Handle walk-in patient registration
6. Book appointments as needed

**Patient Visit:**
1. Patient arrives
2. Check if registered (search Patients tab)
3. If not registered: Go to Register Patient tab
4. If already registered: Check/create appointment
5. Provide appointment details

**Staff Absence:**
1. Staff informs about absence
2. Go to Mark Absence tab
3. Select staff member
4. Choose absence type
5. Set dates
6. Save
7. Doctors automatically notified of absence

---

## 📞 Support Tips

- Use browser DevTools (F12) to debug
- Check Network tab for API responses
- Review browser console for JavaScript errors
- Check backend server logs
- Verify MySQL connection is active
- Ensure all environment variables set correctly

---

**Ready to use! Login and start managing patients and appointments!** 🏥
