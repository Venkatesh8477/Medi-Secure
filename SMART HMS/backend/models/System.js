const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendance_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['present', 'absent', 'leave'], default: 'present' },
    check_in_time: String,
    check_out_time: String,
    notes: String
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
staffAttendanceSchema.index({ user: 1 });
staffAttendanceSchema.index({ attendance_date: 1 });

const auditLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, maxLength: 100 },
    entity_type: { type: String, maxLength: 100 },
    entity_id: String, // String because MongoDB ObjectIds are strings
    old_value: String,
    new_value: String,
    ip_address: { type: String, maxLength: 50 },
    user_agent: String
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ created_at: 1 });

module.exports = {
    StaffAttendance: mongoose.model('StaffAttendance', staffAttendanceSchema),
    AuditLog: mongoose.model('AuditLog', auditLogSchema)
};
