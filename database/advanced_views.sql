-- HEALIX ADVANCED REPORTING VIEWS
-- Run after 07_upgrade.sql and before/after 08_advanced_business_rules.sql.

CREATE OR REPLACE VIEW doctor_utilization_view AS
SELECT d.doctor_id, d.doctor_name,
       dep.department_name,
       count(a.appointment_id) AS total_appointments,
       count(a.appointment_id) FILTER (WHERE upper(coalesce(a.status,''))='COMPLETED') AS completed_appointments,
       count(a.appointment_id) FILTER (WHERE upper(coalesce(a.status,''))='CANCELLED') AS cancelled_appointments,
       round(100.0 * count(a.appointment_id) FILTER (WHERE upper(coalesce(a.status,''))='COMPLETED') / NULLIF(count(a.appointment_id),0),2) AS completion_rate
FROM doctor d
LEFT JOIN department dep ON dep.department_id=d.department_id
LEFT JOIN doctor_room_slot drs ON drs.doctor_id=d.doctor_id
LEFT JOIN appointment a ON a.assignment_id=drs.assignment_id
GROUP BY d.doctor_id,d.doctor_name,dep.department_name;

CREATE OR REPLACE VIEW daily_hospital_load_view AS
SELECT a.appointment_date,
       count(*) AS total_appointments,
       count(*) FILTER (WHERE upper(coalesce(a.status,''))='COMPLETED') AS completed,
       count(*) FILTER (WHERE upper(coalesce(a.status,''))='CANCELLED') AS cancelled,
       count(DISTINCT a.patient_id) AS unique_patients,
       count(DISTINCT drs.doctor_id) AS active_doctors
FROM appointment a
JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id
GROUP BY a.appointment_date;

CREATE OR REPLACE VIEW medicine_usage_view AS
SELECT m.medicine_id,m.medicine_name,m.generic_name,m.unit_price,
       coalesce(sum(pm.quantity),0) AS prescribed_units,
       count(DISTINCT pm.prescription_id) AS prescription_count,
       m.stock_quantity,m.reorder_level,
       CASE WHEN m.stock_quantity=0 THEN 'OUT_OF_STOCK'
            WHEN m.stock_quantity<=m.reorder_level THEN 'LOW_STOCK'
            ELSE 'NORMAL' END AS stock_status
FROM medicine m
LEFT JOIN prescription_medicine pm ON pm.medicine_id=m.medicine_id
GROUP BY m.medicine_id,m.medicine_name,m.generic_name,m.unit_price,m.stock_quantity,m.reorder_level;

CREATE OR REPLACE VIEW outstanding_bill_view AS
SELECT b.bill_id,a.appointment_id,a.appointment_date,
       p.patient_id,p.patient_name,d.doctor_name,
       b.total_amount,b.payment_method,b.payment_status,b.payment_date
FROM bill b
JOIN appointment a ON a.appointment_id=b.appointment_id
JOIN patient p ON p.patient_id=a.patient_id
JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id
JOIN doctor d ON d.doctor_id=drs.doctor_id
WHERE upper(coalesce(b.payment_status,'')) NOT IN ('PAID','COMPLETED');

CREATE OR REPLACE VIEW active_admission_view AS
SELECT ba.bed_assignment_id,ba.patient_id,p.patient_name,
       ba.ward_id,w.ward_name,w.ward_type,w.floor,
       ba.admission_date,ba.status,
       (CURRENT_DATE-ba.admission_date) AS length_of_stay_days
FROM bed_assignment ba
JOIN patient p ON p.patient_id=ba.patient_id
JOIN ward w ON w.ward_id=ba.ward_id
WHERE ba.status='ADMITTED';

CREATE OR REPLACE VIEW hospital_dashboard_view AS
SELECT
 (SELECT count(*) FROM patient) AS total_patients,
 (SELECT count(*) FROM doctor) AS total_doctors,
 (SELECT count(*) FROM staff) AS total_staff,
 (SELECT count(*) FROM appointment WHERE appointment_date=CURRENT_DATE) AS today_appointments,
 (SELECT count(*) FROM appointment WHERE upper(coalesce(status,''))='COMPLETED' AND appointment_date=CURRENT_DATE) AS today_completed,
 (SELECT count(*) FROM bed_assignment WHERE status='ADMITTED') AS active_admissions,
 (SELECT coalesce(sum(total_amount),0) FROM bill) AS total_billed,
 (SELECT coalesce(sum(total_amount),0) FROM bill WHERE upper(coalesce(payment_status,'')) IN ('PAID','COMPLETED')) AS total_paid,
 (SELECT coalesce(sum(total_amount),0) FROM bill WHERE upper(coalesce(payment_status,'')) NOT IN ('PAID','COMPLETED')) AS total_outstanding,
 (SELECT count(*) FROM medicine WHERE stock_quantity=0) AS out_of_stock_medicines,
 (SELECT count(*) FROM medicine WHERE stock_quantity<=reorder_level) AS low_stock_medicines;

CREATE OR REPLACE VIEW patient_full_history_view AS
SELECT p.patient_id,p.patient_name,p.blood_group,
       a.appointment_id,a.appointment_date,a.status AS appointment_status,
       d.doctor_name,dep.department_name,
       mr.record_id,mr.diagnosis,mr.treatment,
       pr.prescription_id,pr.date AS prescription_date,pr.advice
FROM patient p
LEFT JOIN appointment a ON a.patient_id=p.patient_id
LEFT JOIN doctor_room_slot drs ON drs.assignment_id=a.assignment_id
LEFT JOIN doctor d ON d.doctor_id=drs.doctor_id
LEFT JOIN department dep ON dep.department_id=d.department_id
LEFT JOIN medical_record mr ON mr.patient_id=p.patient_id
LEFT JOIN prescription pr ON pr.record_id=mr.record_id;
