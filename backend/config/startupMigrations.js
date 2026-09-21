const pool = require('./db');

/**
 * Non-destructive startup migrations for the HEALIX rules requested in the UI.
 * Existing data is preserved. New columns are nullable so legacy lab requests remain readable.
 */
async function runStartupMigrations() {
  await pool.query('BEGIN');
  try {
    // Core compatibility upgrades used by the current HEALIX UI.
    await pool.query(`ALTER TABLE medicine ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 100, ADD COLUMN IF NOT EXISTS reorder_level INTEGER NOT NULL DEFAULT 10`);
    await pool.query(`ALTER TABLE prescription_medicine ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bed_assignment (
        bed_assignment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patient(patient_id),
        ward_id INTEGER NOT NULL REFERENCES ward(ward_id),
        admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
        discharge_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'ADMITTED'
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_item (
        bill_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bill(bill_id) ON DELETE CASCADE,
        item_type VARCHAR(30) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE lab_request

        ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patient(patient_id),
        ADD COLUMN IF NOT EXISTS scheduled_date DATE,
        ADD COLUMN IF NOT EXISTS scheduled_time TIME
    `);

    await pool.query(`
      ALTER TABLE bill
        ALTER COLUMN appointment_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS ambulance_booking_id INTEGER
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ambulance (
        ambulance_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ambulance_no VARCHAR(30) NOT NULL UNIQUE,
        ambulance_type VARCHAR(50) NOT NULL DEFAULT 'Standard',
        status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','RESERVED','IN_SERVICE','MAINTENANCE','INACTIVE')),
        active BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ambulance_booking (
        booking_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patient(patient_id),
        ambulance_id INTEGER REFERENCES ambulance(ambulance_id),
        booking_date DATE NOT NULL,
        booking_time TIME NOT NULL,
        pickup_location VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','IN_SERVICE','COMPLETED')),
        rate_per_km NUMERIC(10,2) NOT NULL DEFAULT 50.00 CHECK (rate_per_km >= 0),
        actual_distance_km NUMERIC(10,2) CHECK (actual_distance_km >= 0),
        final_amount NUMERIC(10,2) CHECK (final_amount >= 0),
        assigned_staff_id INTEGER REFERENCES staff(staff_id),
        bill_id INTEGER,
        notes VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_bill_ambulance_booking') THEN ALTER TABLE bill ADD CONSTRAINT fk_bill_ambulance_booking FOREIGN KEY (ambulance_booking_id) REFERENCES ambulance_booking(booking_id) ON DELETE SET NULL; END IF; END $$`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ambulance_status ON ambulance(status, active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ambulance_booking_patient ON ambulance_booking(patient_id, booking_date DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ambulance_booking_schedule ON ambulance_booking(booking_date, booking_time, status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bill_ambulance_booking ON bill(ambulance_booking_id)`);

    // Facility inventory values used by the public homepage.
    // Kept in PostgreSQL so the homepage is not dependent on hard-coded numbers.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS facility_inventory (
        item_key VARCHAR(50) PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      INSERT INTO facility_inventory (item_key, value)
      VALUES ('ventilators', 20)
      ON CONFLICT (item_key) DO NOTHING
    `);

    // Repair legacy duplicate ambulance bills and enforce one bill per booking.
    await pool.query(`
      CREATE TEMP TABLE healix_ambulance_bill_keep ON COMMIT DROP AS
      SELECT DISTINCT ON (ambulance_booking_id)
        bill_id, ambulance_booking_id
      FROM bill
      WHERE ambulance_booking_id IS NOT NULL
      ORDER BY ambulance_booking_id,
        CASE WHEN LOWER(COALESCE(payment_status,'')) IN ('paid','completed') THEN 0 ELSE 1 END,
        bill_id DESC
    `);
    await pool.query(`
      UPDATE ambulance_booking ab
      SET bill_id = k.bill_id
      FROM healix_ambulance_bill_keep k
      WHERE ab.booking_id = k.ambulance_booking_id
        AND ab.bill_id IS DISTINCT FROM k.bill_id
    `);
    await pool.query(`
      DELETE FROM bill b
      WHERE b.ambulance_booking_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM healix_ambulance_bill_keep k
          WHERE k.bill_id = b.bill_id
        )
    `);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_one_per_ambulance_booking ON bill(ambulance_booking_id) WHERE ambulance_booking_id IS NOT NULL`);
    await pool.query(`INSERT INTO ambulance (ambulance_no, ambulance_type) VALUES ('AMB-001','Standard') ON CONFLICT (ambulance_no) DO NOTHING`);
    await pool.query(`UPDATE ambulance SET status='AVAILABLE', active=TRUE WHERE status NOT IN ('MAINTENANCE','INACTIVE')`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lab_request_patient_date ON lab_request(patient_id, request_date DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lab_request_schedule ON lab_request(scheduled_date, scheduled_time)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS specialization_department (
        specialization_id INTEGER PRIMARY KEY REFERENCES specialization(specialization_id) ON DELETE CASCADE,
        department_id INTEGER NOT NULL REFERENCES department(department_id) ON DELETE CASCADE
      )
    `);

    // HEALIX currently has matching department/specialization master names.
    // Seed missing mappings by exact normalized name without duplicating rows.
    await pool.query(`
      INSERT INTO specialization_department (specialization_id, department_id)
      SELECT s.specialization_id, d.department_id
      FROM specialization s
      JOIN department d ON lower(trim(s.specialization_name)) = lower(trim(d.department_name))
      ON CONFLICT (specialization_id) DO NOTHING
    `);

    // Repair legacy doctor rows where the specialization has an explicit department mapping.
    await pool.query(`
      UPDATE doctor d
      SET department_id = sd.department_id
      FROM specialization_department sd
      WHERE d.specialization_id = sd.specialization_id
        AND d.department_id IS DISTINCT FROM sd.department_id
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION healix_validate_doctor_department()
      RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE expected_department INTEGER;
      BEGIN
        IF NEW.specialization_id IS NULL OR NEW.department_id IS NULL THEN
          RETURN NEW;
        END IF;
        SELECT department_id INTO expected_department
        FROM specialization_department
        WHERE specialization_id = NEW.specialization_id;
        IF expected_department IS NOT NULL AND NEW.department_id <> expected_department THEN
          RAISE EXCEPTION 'Selected specialization belongs to a different department. Choose the matching department.';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await pool.query(`DROP TRIGGER IF EXISTS validate_doctor_department ON doctor`);
    await pool.query(`
      CREATE TRIGGER validate_doctor_department
      BEFORE INSERT OR UPDATE OF department_id, specialization_id ON doctor
      FOR EACH ROW EXECUTE FUNCTION healix_validate_doctor_department()
    `);

    // A phone number is a global login identifier in HEALIX. Prevent reuse across account types.
    await pool.query(`
      CREATE OR REPLACE FUNCTION healix_validate_unique_phone()
      RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE phone_value TEXT;
      BEGIN
        IF TG_TABLE_NAME = 'patient' THEN phone_value := NEW.patient_phone;
        ELSIF TG_TABLE_NAME = 'doctor' THEN phone_value := NEW.doctor_phone;
        ELSIF TG_TABLE_NAME = 'staff' THEN phone_value := NEW.staff_phone;
        ELSE phone_value := NEW.admin_phone;
        END IF;

        IF phone_value IS NULL OR btrim(phone_value) = '' THEN RETURN NEW; END IF;

        IF TG_TABLE_NAME <> 'patient' AND EXISTS (SELECT 1 FROM patient WHERE patient_phone = phone_value) THEN
          RAISE EXCEPTION 'Phone number is already registered to another user.';
        END IF;
        IF TG_TABLE_NAME <> 'doctor' AND EXISTS (SELECT 1 FROM doctor WHERE doctor_phone = phone_value) THEN
          RAISE EXCEPTION 'Phone number is already registered to another user.';
        END IF;
        IF TG_TABLE_NAME <> 'staff' AND EXISTS (SELECT 1 FROM staff WHERE staff_phone = phone_value) THEN
          RAISE EXCEPTION 'Phone number is already registered to another user.';
        END IF;
        IF TG_TABLE_NAME <> 'admin' AND EXISTS (SELECT 1 FROM admin WHERE admin_phone = phone_value) THEN
          RAISE EXCEPTION 'Phone number is already registered to another user.';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    for (const table of ['patient', 'doctor', 'staff', 'admin']) {
      await pool.query(`DROP TRIGGER IF EXISTS validate_unique_phone_${table} ON ${table}`);
      await pool.query(`
        CREATE TRIGGER validate_unique_phone_${table}
        BEFORE INSERT OR UPDATE OF ${table === 'patient' ? 'patient_phone' : table === 'doctor' ? 'doctor_phone' : table === 'staff' ? 'staff_phone' : 'admin_phone'} ON ${table}
        FOR EACH ROW EXECUTE FUNCTION healix_validate_unique_phone()
      `);
    }

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

module.exports = { runStartupMigrations };
