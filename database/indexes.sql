-- HEALIX performance indexes.
CREATE INDEX IF NOT EXISTS idx_appointment_patient_date ON appointment(patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointment_assignment_date ON appointment(assignment_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointment_status ON appointment(status);
CREATE INDEX IF NOT EXISTS idx_doctor_department ON doctor(department_id);
CREATE INDEX IF NOT EXISTS idx_doctor_specialization ON doctor(specialization_id);
CREATE INDEX IF NOT EXISTS idx_drs_doctor_slot ON doctor_room_slot(doctor_id, slot_id);
CREATE INDEX IF NOT EXISTS idx_drs_room_slot ON doctor_room_slot(room_id, slot_id);
CREATE INDEX IF NOT EXISTS idx_lab_request_staff_status ON lab_request(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_surgery_doctor_date ON surgery(doctor_id, surgery_date);
CREATE INDEX IF NOT EXISTS idx_bill_appointment ON bill(appointment_id);
CREATE INDEX IF NOT EXISTS idx_bill_payment_status ON bill(payment_status);
CREATE INDEX IF NOT EXISTS idx_bed_assignment_patient ON bed_assignment(patient_id);
CREATE INDEX IF NOT EXISTS idx_bed_assignment_ward_status ON bed_assignment(ward_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_per_patient ON bed_assignment(patient_id) WHERE status = 'ADMITTED';
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_per_ward_patient ON bed_assignment(patient_id, ward_id) WHERE status = 'ADMITTED';
CREATE INDEX IF NOT EXISTS idx_bill_item_bill ON bill_item(bill_id);
