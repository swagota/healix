-- HEALIX business-rule upgrade.
-- Non-destructive. Safe to run repeatedly.
-- The application also runs the same structural changes automatically at backend startup.

ALTER TABLE lab_request
  ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patient(patient_id),
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;

CREATE INDEX IF NOT EXISTS idx_lab_request_patient_date ON lab_request(patient_id, request_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_request_schedule ON lab_request(scheduled_date, scheduled_time);

CREATE TABLE IF NOT EXISTS specialization_department (
  specialization_id INTEGER PRIMARY KEY REFERENCES specialization(specialization_id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES department(department_id) ON DELETE CASCADE
);

INSERT INTO specialization_department (specialization_id, department_id)
SELECT s.specialization_id, d.department_id
FROM specialization s
JOIN department d ON lower(trim(s.specialization_name))=lower(trim(d.department_name))
ON CONFLICT (specialization_id) DO NOTHING;

UPDATE doctor d
SET department_id=sd.department_id
FROM specialization_department sd
WHERE d.specialization_id=sd.specialization_id
  AND d.department_id IS DISTINCT FROM sd.department_id;

CREATE OR REPLACE FUNCTION healix_validate_doctor_department()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_department INTEGER;
BEGIN
  IF NEW.specialization_id IS NULL OR NEW.department_id IS NULL THEN RETURN NEW; END IF;
  SELECT department_id INTO expected_department FROM specialization_department WHERE specialization_id=NEW.specialization_id;
  IF expected_department IS NOT NULL AND NEW.department_id<>expected_department THEN
    RAISE EXCEPTION 'Selected specialization belongs to a different department. Choose the matching department.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_doctor_department ON doctor;
CREATE TRIGGER validate_doctor_department
BEFORE INSERT OR UPDATE OF department_id,specialization_id ON doctor
FOR EACH ROW EXECUTE FUNCTION healix_validate_doctor_department();

CREATE OR REPLACE FUNCTION healix_validate_unique_phone()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE phone_value TEXT;
BEGIN
  IF TG_TABLE_NAME='patient' THEN phone_value:=NEW.patient_phone;
  ELSIF TG_TABLE_NAME='doctor' THEN phone_value:=NEW.doctor_phone;
  ELSIF TG_TABLE_NAME='staff' THEN phone_value:=NEW.staff_phone;
  ELSE phone_value:=NEW.admin_phone;
  END IF;
  IF phone_value IS NULL OR btrim(phone_value)='' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME<>'patient' AND EXISTS(SELECT 1 FROM patient WHERE patient_phone=phone_value) THEN RAISE EXCEPTION 'Phone number is already registered to another user.'; END IF;
  IF TG_TABLE_NAME<>'doctor' AND EXISTS(SELECT 1 FROM doctor WHERE doctor_phone=phone_value) THEN RAISE EXCEPTION 'Phone number is already registered to another user.'; END IF;
  IF TG_TABLE_NAME<>'staff' AND EXISTS(SELECT 1 FROM staff WHERE staff_phone=phone_value) THEN RAISE EXCEPTION 'Phone number is already registered to another user.'; END IF;
  IF TG_TABLE_NAME<>'admin' AND EXISTS(SELECT 1 FROM admin WHERE admin_phone=phone_value) THEN RAISE EXCEPTION 'Phone number is already registered to another user.'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_unique_phone_patient ON patient;
CREATE TRIGGER validate_unique_phone_patient BEFORE INSERT OR UPDATE OF patient_phone ON patient FOR EACH ROW EXECUTE FUNCTION healix_validate_unique_phone();
DROP TRIGGER IF EXISTS validate_unique_phone_doctor ON doctor;
CREATE TRIGGER validate_unique_phone_doctor BEFORE INSERT OR UPDATE OF doctor_phone ON doctor FOR EACH ROW EXECUTE FUNCTION healix_validate_unique_phone();
DROP TRIGGER IF EXISTS validate_unique_phone_staff ON staff;
CREATE TRIGGER validate_unique_phone_staff BEFORE INSERT OR UPDATE OF staff_phone ON staff FOR EACH ROW EXECUTE FUNCTION healix_validate_unique_phone();
DROP TRIGGER IF EXISTS validate_unique_phone_admin ON admin;
CREATE TRIGGER validate_unique_phone_admin BEFORE INSERT OR UPDATE OF admin_phone ON admin FOR EACH ROW EXECUTE FUNCTION healix_validate_unique_phone();

-- STAFF ACCOUNT MANAGEMENT RULE
-- Staff login accounts remain hospital-managed. Only staff members whose
-- staff.role is HR / HR Staff / HR Manager / Senior Staff / Staff Manager / Manager
-- may create operational staff accounts through the application API.
-- They cannot create admin accounts or another privileged HR/manager staff account.
-- This rule is enforced server-side in backend/middleware_auth.js and
-- backend/controllers/staffController.js; no existing table structure is changed.
