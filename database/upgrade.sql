-- HEALIX database upgrade. Run AFTER schema.sql and data.sql.
-- Safe to run more than once.

ALTER TABLE medicine
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS reorder_level INTEGER NOT NULL DEFAULT 10;

ALTER TABLE prescription_medicine
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS bed_assignment (
    bed_assignment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patient(patient_id),
    ward_id INTEGER NOT NULL REFERENCES ward(ward_id),
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    discharge_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ADMITTED',
    CHECK (status IN ('ADMITTED','DISCHARGED','CANCELLED')),
    CHECK (discharge_date IS NULL OR discharge_date >= admission_date)
);

CREATE TABLE IF NOT EXISTS bill_item (
    bill_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE department ADD CONSTRAINT uq_department_name UNIQUE (department_name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE specialization ADD CONSTRAINT uq_specialization_name UNIQUE (specialization_name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE room ADD CONSTRAINT uq_room_no UNIQUE (room_no);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE time_slot ADD CONSTRAINT ck_time_slot_order CHECK (end_time > start_time);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE doctor ADD CONSTRAINT ck_doctor_fee_nonnegative CHECK (coalesce(consultation_fee,0) >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ward ADD CONSTRAINT ck_ward_beds_valid CHECK (total_bed >= 0 AND available_bed >= 0 AND available_bed <= total_bed);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE bill ADD CONSTRAINT ck_bill_amount_nonnegative CHECK (total_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE lab_test ADD CONSTRAINT ck_lab_cost_nonnegative CHECK (coalesce(cost,0) >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE surgery ADD CONSTRAINT ck_surgery_cost_nonnegative CHECK (coalesce(cost,0) >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE medicine ADD CONSTRAINT ck_medicine_stock_nonnegative CHECK (stock_quantity >= 0 AND reorder_level >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE prescription_medicine ADD CONSTRAINT ck_prescription_quantity_positive CHECK (quantity > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
