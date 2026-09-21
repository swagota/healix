-- HEALIX advanced database functions
-- Run schema.sql + data.sql first, then upgrade.sql, triggers.sql, views.sql, indexes.sql.

CREATE OR REPLACE FUNCTION get_available_appointment_slots(
    p_date DATE,
    p_department_id INTEGER DEFAULT NULL,
    p_specialization_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    assignment_id INTEGER,
    doctor_id INTEGER,
    doctor_name VARCHAR,
    department_id INTEGER,
    department_name VARCHAR,
    specialization_id INTEGER,
    specialization_name VARCHAR,
    room_id INTEGER,
    room_no VARCHAR,
    slot_id INTEGER,
    day VARCHAR,
    start_time TIME,
    end_time TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        drs.assignment_id,
        d.doctor_id,
        d.doctor_name,
        dep.department_id,
        dep.department_name,
        sp.specialization_id,
        sp.specialization_name,
        r.room_id,
        r.room_no,
        ts.slot_id,
        ts.day,
        ts.start_time,
        ts.end_time
    FROM doctor_room_slot drs
    JOIN doctor d ON d.doctor_id = drs.doctor_id
    LEFT JOIN department dep ON dep.department_id = d.department_id
    LEFT JOIN specialization sp ON sp.specialization_id = d.specialization_id
    JOIN room r ON r.room_id = drs.room_id
    JOIN time_slot ts ON ts.slot_id = drs.slot_id
    WHERE lower(trim(ts.day)) = lower(to_char(p_date, 'FMDay'))
      AND (p_department_id IS NULL OR d.department_id = p_department_id)
      AND (p_specialization_id IS NULL OR d.specialization_id = p_specialization_id)
      AND NOT EXISTS (
          SELECT 1
          FROM appointment a
          WHERE a.assignment_id = drs.assignment_id
            AND a.appointment_date = p_date
            AND upper(coalesce(a.status, 'PENDING')) NOT IN ('CANCELLED')
      )
    ORDER BY ts.start_time, d.doctor_name, r.room_no;
END;
$$;

CREATE OR REPLACE FUNCTION book_appointment(
    p_patient_id INTEGER,
    p_assignment_id INTEGER,
    p_appointment_date DATE,
    p_status VARCHAR DEFAULT 'Scheduled'
)
RETURNS appointment
LANGUAGE plpgsql
AS $$
DECLARE
    v_slot time_slot%ROWTYPE;
    v_assignment doctor_room_slot%ROWTYPE;
    v_doctor_id INTEGER;
    v_new appointment%ROWTYPE;
BEGIN
    IF p_appointment_date IS NULL THEN
        RAISE EXCEPTION 'Appointment date is required';
    END IF;

    IF p_appointment_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Appointment date cannot be in the past';
    END IF;

    PERFORM 1 FROM patient WHERE patient_id = p_patient_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient % does not exist', p_patient_id;
    END IF;

    SELECT * INTO v_assignment
    FROM doctor_room_slot
    WHERE assignment_id = p_assignment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Doctor-room-slot assignment % does not exist', p_assignment_id;
    END IF;

    SELECT * INTO v_slot FROM time_slot WHERE slot_id = v_assignment.slot_id;

    IF lower(trim(v_slot.day)) <> lower(to_char(p_appointment_date, 'FMDay')) THEN
        RAISE EXCEPTION 'Selected date does not match the assigned time slot day';
    END IF;

    v_doctor_id := v_assignment.doctor_id;

    IF EXISTS (
        SELECT 1
        FROM appointment a
        WHERE a.assignment_id = p_assignment_id
          AND a.appointment_date = p_appointment_date
          AND upper(coalesce(a.status, 'PENDING')) NOT IN ('CANCELLED')
    ) THEN
        RAISE EXCEPTION 'Selected doctor, room and time slot is already booked';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM appointment a
        JOIN doctor_room_slot drs ON drs.assignment_id = a.assignment_id
        JOIN time_slot old_ts ON old_ts.slot_id = drs.slot_id
        WHERE a.patient_id = p_patient_id
          AND a.appointment_date = p_appointment_date
          AND upper(coalesce(a.status, 'PENDING')) NOT IN ('CANCELLED')
          AND old_ts.start_time < v_slot.end_time
          AND v_slot.start_time < old_ts.end_time
    ) THEN
        RAISE EXCEPTION 'Patient already has another appointment at an overlapping time';
    END IF;

    INSERT INTO appointment (appointment_date, status, patient_id, assignment_id)
    VALUES (p_appointment_date, coalesce(p_status, 'Scheduled'), p_patient_id, p_assignment_id)
    RETURNING * INTO v_new;

    RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION get_patient_medical_summary(p_patient_id INTEGER)
RETURNS TABLE (
    patient_id INTEGER,
    patient_name VARCHAR,
    blood_group VARCHAR,
    appointment_count BIGINT,
    medical_record_count BIGINT,
    prescription_count BIGINT,
    surgery_count BIGINT,
    unpaid_bill_count BIGINT,
    total_billed NUMERIC
)
LANGUAGE sql
AS $$
    SELECT
        p.patient_id,
        p.patient_name,
        p.blood_group,
        (SELECT count(*) FROM appointment a WHERE a.patient_id = p.patient_id),
        (SELECT count(*) FROM medical_record mr WHERE mr.patient_id = p.patient_id),
        (SELECT count(*) FROM prescription pr JOIN medical_record mr ON mr.record_id = pr.record_id WHERE mr.patient_id = p.patient_id),
        (SELECT count(*) FROM surgery s WHERE s.patient_id = p.patient_id),
        (SELECT count(*) FROM bill b JOIN appointment a ON a.appointment_id = b.appointment_id WHERE a.patient_id = p.patient_id AND upper(coalesce(b.payment_status,'')) <> 'PAID'),
        coalesce((SELECT sum(b.total_amount) FROM bill b JOIN appointment a ON a.appointment_id = b.appointment_id WHERE a.patient_id = p.patient_id), 0)
    FROM patient p
    WHERE p.patient_id = p_patient_id;
$$;

CREATE OR REPLACE FUNCTION get_doctor_schedule(p_doctor_id INTEGER)
RETURNS TABLE (
    assignment_id INTEGER,
    doctor_id INTEGER,
    doctor_name VARCHAR,
    department_name VARCHAR,
    specialization_name VARCHAR,
    room_no VARCHAR,
    day VARCHAR,
    start_time TIME,
    end_time TIME
)
LANGUAGE sql
AS $$
    SELECT drs.assignment_id, d.doctor_id, d.doctor_name,
           dep.department_name, sp.specialization_name,
           r.room_no, ts.day, ts.start_time, ts.end_time
    FROM doctor_room_slot drs
    JOIN doctor d ON d.doctor_id = drs.doctor_id
    LEFT JOIN department dep ON dep.department_id = d.department_id
    LEFT JOIN specialization sp ON sp.specialization_id = d.specialization_id
    JOIN room r ON r.room_id = drs.room_id
    JOIN time_slot ts ON ts.slot_id = drs.slot_id
    WHERE d.doctor_id = p_doctor_id
    ORDER BY CASE lower(ts.day)
        WHEN 'sunday' THEN 0 WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6 ELSE 7 END,
        ts.start_time;
$$;

CREATE OR REPLACE FUNCTION calculate_patient_bill(p_patient_id INTEGER)
RETURNS NUMERIC
LANGUAGE sql
AS $$
    SELECT coalesce(sum(b.total_amount),0)::NUMERIC
    FROM bill b
    JOIN appointment a ON a.appointment_id = b.appointment_id
    WHERE a.patient_id = p_patient_id;
$$;

CREATE OR REPLACE FUNCTION get_dashboard_statistics()
RETURNS TABLE (
    total_patients BIGINT,
    total_doctors BIGINT,
    total_appointments BIGINT,
    scheduled_appointments BIGINT,
    completed_appointments BIGINT,
    pending_lab_requests BIGINT,
    total_wards BIGINT,
    available_beds BIGINT,
    unpaid_bills NUMERIC
)
LANGUAGE sql
AS $$
    SELECT
      (SELECT count(*) FROM patient),
      (SELECT count(*) FROM doctor),
      (SELECT count(*) FROM appointment),
      (SELECT count(*) FROM appointment WHERE upper(coalesce(status,'')) IN ('SCHEDULED','PENDING')),
      (SELECT count(*) FROM appointment WHERE upper(coalesce(status,'')) = 'COMPLETED'),
      (SELECT count(*) FROM lab_request WHERE upper(coalesce(status,'')) = 'PENDING'),
      (SELECT count(*) FROM ward),
      (SELECT coalesce(sum(available_bed),0) FROM ward),
      (SELECT coalesce(sum(total_amount),0) FROM bill WHERE upper(coalesce(payment_status,'')) <> 'PAID');
$$;
