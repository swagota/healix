-- HEALIX FINAL HARDENING / PERFORMANCE UPGRADE
-- Run last. Safe to run repeatedly.

CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_email_lower ON doctor (lower(doctor_email)) WHERE doctor_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_phone ON patient (patient_phone) WHERE patient_phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_email_lower ON staff (lower(staff_email)) WHERE staff_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_email_lower ON admin (lower(admin_email)) WHERE admin_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_room_slot ON doctor_room_slot(doctor_id, room_id, slot_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_patient_date ON medical_record(patient_id, admission_date DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_record_date ON prescription(record_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_medicine_medicine ON prescription_medicine(medicine_id);
CREATE INDEX IF NOT EXISTS idx_surgery_patient_date ON surgery(patient_id, surgery_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_request_test_status ON lab_request(test_id, status);
CREATE INDEX IF NOT EXISTS idx_bed_assignment_ward_admission ON bed_assignment(ward_id, admission_date DESC) WHERE status='ADMITTED';
CREATE INDEX IF NOT EXISTS idx_bill_unpaid ON bill(payment_status) WHERE upper(coalesce(payment_status,'')) NOT IN ('PAID','COMPLETED');

-- Defensive validation for common master-data values.
DO $$ BEGIN
    ALTER TABLE patient ADD CONSTRAINT ck_patient_blood_group
      CHECK (blood_group IS NULL OR blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE medicine ADD CONSTRAINT ck_medicine_price_nonnegative
      CHECK (coalesce(unit_price,0) >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Helpful permissions note:
-- In production, create a read-only reporting role and expose only views/functions.
-- Example (run manually as database owner if required):
-- CREATE ROLE healix_reporter NOLOGIN;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO healix_reporter;
-- REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM healix_reporter;

-- Public homepage facility statistics.
CREATE TABLE IF NOT EXISTS facility_inventory (
    item_key VARCHAR(50) PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO facility_inventory (item_key, value)
VALUES ('ventilators', 20)
ON CONFLICT (item_key) DO NOTHING;
