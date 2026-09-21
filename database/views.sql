-- HEALIX database views for reporting and frontend queries.

CREATE OR REPLACE VIEW doctor_schedule_view AS
SELECT
    drs.assignment_id,
    d.doctor_id,
    d.doctor_name,
    dep.department_name,
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
JOIN time_slot ts ON ts.slot_id = drs.slot_id;

CREATE OR REPLACE VIEW ward_availability_view AS
SELECT
    ward_id,
    ward_name,
    ward_type,
    floor,
    total_bed,
    available_bed,
    (total_bed - available_bed) AS occupied_bed,
    CASE WHEN total_bed = 0 THEN 0
         ELSE round(((total_bed - available_bed)::numeric / total_bed) * 100, 2)
    END AS occupancy_percentage
FROM ward;

CREATE OR REPLACE VIEW patient_medical_summary_view AS
SELECT
    p.patient_id,
    p.patient_name,
    p.patient_gender,
    p.dob,
    p.patient_phone,
    p.blood_group,
    (SELECT count(*) FROM appointment a WHERE a.patient_id = p.patient_id) AS appointment_count,
    (SELECT count(*) FROM medical_record mr WHERE mr.patient_id = p.patient_id) AS medical_record_count,
    (SELECT count(*) FROM prescription pr JOIN medical_record mr ON mr.record_id = pr.record_id WHERE mr.patient_id = p.patient_id) AS prescription_count,
    (SELECT count(*) FROM surgery s WHERE s.patient_id = p.patient_id) AS surgery_count,
    (SELECT count(*) FROM bill b JOIN appointment a ON a.appointment_id = b.appointment_id WHERE a.patient_id = p.patient_id) AS bill_count,
    coalesce((SELECT sum(b.total_amount) FROM bill b JOIN appointment a ON a.appointment_id = b.appointment_id WHERE a.patient_id = p.patient_id),0) AS total_billed
FROM patient p;

CREATE OR REPLACE VIEW appointment_detail_view AS
SELECT
    a.appointment_id,
    a.appointment_date,
    a.status,
    p.patient_id,
    p.patient_name,
    d.doctor_id,
    d.doctor_name,
    dep.department_name,
    sp.specialization_name,
    r.room_no,
    ts.day,
    ts.start_time,
    ts.end_time
FROM appointment a
JOIN patient p ON p.patient_id = a.patient_id
JOIN doctor_room_slot drs ON drs.assignment_id = a.assignment_id
JOIN doctor d ON d.doctor_id = drs.doctor_id
LEFT JOIN department dep ON dep.department_id = d.department_id
LEFT JOIN specialization sp ON sp.specialization_id = d.specialization_id
JOIN room r ON r.room_id = drs.room_id
JOIN time_slot ts ON ts.slot_id = drs.slot_id;

CREATE OR REPLACE VIEW medicine_stock_view AS
SELECT
    medicine_id,
    medicine_name,
    generic_name,
    unit_price,
    stock_quantity,
    reorder_level,
    CASE WHEN stock_quantity = 0 THEN 'OUT_OF_STOCK'
         WHEN stock_quantity <= reorder_level THEN 'LOW_STOCK'
         ELSE 'IN_STOCK' END AS stock_status
FROM medicine;
