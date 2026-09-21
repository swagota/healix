-- HEALIX ADVANCED DATABASE BUSINESS RULES (FIXED)
-- PostgreSQL. Run after 07_upgrade.sql.

CREATE OR REPLACE FUNCTION validate_patient_age_for_surgery() RETURNS trigger LANGUAGE plpgsql AS $$ 
DECLARE v_dob date; 
BEGIN     
    SELECT dob INTO v_dob FROM patient WHERE patient_id = NEW.patient_id;     
    IF v_dob IS NULL THEN RETURN NEW; END IF;     
    IF NEW.surgery_date IS NOT NULL AND NEW.surgery_date < v_dob THEN         
        RAISE EXCEPTION 'Surgery date cannot be before patient date of birth';     
    END IF;     
    RETURN NEW; 
END; 
$$;

DROP TRIGGER IF EXISTS validate_patient_age_for_surgery ON surgery; 
CREATE TRIGGER validate_patient_age_for_surgery 
BEFORE INSERT OR UPDATE ON surgery 
FOR EACH ROW EXECUTE FUNCTION validate_patient_age_for_surgery();

CREATE OR REPLACE FUNCTION get_doctor_availability(     
    p_date date,     
    p_doctor_id integer DEFAULT NULL,     
    p_department_id integer DEFAULT NULL,     
    p_specialization_id integer DEFAULT NULL 
) 
RETURNS TABLE(     
    assignment_id integer,     
    doctor_id integer,     
    doctor_name varchar,     
    department_name varchar,     
    specialization_name varchar,     
    room_no varchar,     
    slot_id integer,     
    start_time time,     
    end_time time,     
    booking_status varchar 
) LANGUAGE sql AS $$     
    SELECT drs.assignment_id, d.doctor_id, d.doctor_name,            
           dep.department_name, sp.specialization_name, r.room_no,            
           ts.slot_id, ts.start_time, ts.end_time,            
           CASE WHEN EXISTS (                 
                SELECT 1 FROM appointment a                 
                WHERE a.assignment_id = drs.assignment_id                   
                  AND a.appointment_date = p_date                   
                  AND upper(coalesce(a.status,'')) <> 'CANCELLED'            
           ) THEN 'BOOKED' ELSE 'AVAILABLE' END AS booking_status     
    FROM doctor_room_slot drs     
    JOIN doctor d ON d.doctor_id = drs.doctor_id     
    LEFT JOIN department dep ON dep.department_id = d.department_id     
    LEFT JOIN specialization sp ON sp.specialization_id = d.specialization_id     
    JOIN room r ON r.room_id = drs.room_id     
    JOIN time_slot ts ON ts.slot_id = drs.slot_id     
    WHERE lower(trim(ts.day)) = lower(to_char(p_date, 'FMDay'))       
      AND (p_doctor_id IS NULL OR d.doctor_id = p_doctor_id)       
      AND (p_department_id IS NULL OR d.department_id = p_department_id)       
      AND (p_specialization_id IS NULL OR d.specialization_id = p_specialization_id)     
    ORDER BY ts.start_time, d.doctor_name; 
$$;

CREATE OR REPLACE FUNCTION patient_dashboard(p_patient_id integer) 
RETURNS TABLE(     
    patient_id integer,     
    patient_name varchar,     
    upcoming_appointments bigint,     
    completed_appointments bigint,     
    active_admission boolean,     
    total_prescriptions bigint,     
    total_lab_requests bigint,     
    total_billed numeric,     
    total_paid numeric,     
    outstanding numeric 
) LANGUAGE sql AS $$     
    SELECT p.patient_id, p.patient_name,       
      (SELECT count(*) FROM appointment a WHERE a.patient_id=p.patient_id AND a.appointment_date>=CURRENT_DATE AND upper(coalesce(a.status,'')) NOT IN ('CANCELLED','COMPLETED')),       
      (SELECT count(*) FROM appointment a WHERE a.patient_id=p.patient_id AND upper(coalesce(a.status,''))='COMPLETED'),       
      EXISTS (SELECT 1 FROM bed_assignment ba WHERE ba.patient_id=p.patient_id AND ba.status='ADMITTED'),       
      (SELECT count(*) FROM prescription pr JOIN medical_record mr ON mr.record_id=pr.record_id WHERE mr.patient_id=p.patient_id),       
      0::bigint,       
      coalesce((SELECT sum(b.total_amount) FROM bill b JOIN appointment a ON a.appointment_id=b.appointment_id WHERE a.patient_id=p.patient_id),0),       
      coalesce((SELECT sum(b.total_amount) FROM bill b JOIN appointment a ON a.appointment_id=b.appointment_id WHERE a.patient_id=p.patient_id AND upper(coalesce(b.payment_status,'')) IN ('PAID','COMPLETED')),0),       
      greatest(         
        coalesce((SELECT sum(b.total_amount) FROM bill b JOIN appointment a ON a.appointment_id=b.appointment_id WHERE a.patient_id=p.patient_id),0)         
        - coalesce((SELECT sum(b.total_amount) FROM bill b JOIN appointment a ON a.appointment_id=b.appointment_id WHERE a.patient_id=p.patient_id AND upper(coalesce(b.payment_status,'')) IN ('PAID','COMPLETED')),0),0)     
    FROM patient p WHERE p.patient_id=p_patient_id; 
$$;

CREATE OR REPLACE FUNCTION department_performance_report() 
RETURNS TABLE(     
    department_id integer,     
    department_name varchar,     
    doctor_count bigint,     
    appointment_count bigint,     
    completed_count bigint,     
    cancellation_count bigint,     
    revenue numeric 
) LANGUAGE sql AS $$     
    SELECT dep.department_id, dep.department_name,       
      count(DISTINCT d.doctor_id),       
      count(a.appointment_id),       
      count(a.appointment_id) FILTER (WHERE upper(coalesce(a.status,''))='COMPLETED'),       
      count(a.appointment_id) FILTER (WHERE upper(coalesce(a.status,''))='CANCELLED'),       
      coalesce(sum(b.total_amount),0) AS revenue     
    FROM department dep     
    LEFT JOIN doctor d ON d.department_id=dep.department_id     
    LEFT JOIN doctor_room_slot drs ON drs.doctor_id=d.doctor_id     
    LEFT JOIN appointment a ON a.assignment_id=drs.assignment_id     
    LEFT JOIN bill b ON b.appointment_id=a.appointment_id     
    GROUP BY dep.department_id, dep.department_name     
    ORDER BY coalesce(sum(b.total_amount),0) DESC; 
$$;

CREATE OR REPLACE FUNCTION record_bill_payment(     
    p_bill_id integer,     
    p_payment_method varchar DEFAULT 'CASH' 
) 
RETURNS bill LANGUAGE plpgsql AS $$ 
DECLARE v_bill bill%ROWTYPE; 
BEGIN     
    UPDATE bill        
       SET payment_status='PAID', payment_method=coalesce(p_payment_method,payment_method), payment_date=CURRENT_DATE      
     WHERE bill_id=p_bill_id      
     RETURNING * INTO v_bill;     
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill % not found', p_bill_id; END IF;     
    RETURN v_bill; 
END; 
$$;

CREATE OR REPLACE FUNCTION cancel_appointment(p_appointment_id integer) 
RETURNS appointment LANGUAGE plpgsql AS $$ 
DECLARE v_appointment appointment%ROWTYPE; 
BEGIN     
    UPDATE appointment SET status='CANCELLED'      
     WHERE appointment_id=p_appointment_id      
     RETURNING * INTO v_appointment;     
    IF NOT FOUND THEN RAISE EXCEPTION 'Appointment % not found', p_appointment_id; END IF;     
    RETURN v_appointment; 
END; 
$$;

CREATE OR REPLACE FUNCTION sync_ward_bed_count(p_ward_id integer) 
RETURNS void LANGUAGE plpgsql AS $$ 
BEGIN     
    UPDATE ward w        
       SET available_bed = GREATEST(w.total_bed - (            
           SELECT count(*) FROM bed_assignment ba            
           WHERE ba.ward_id=w.ward_id AND ba.status='ADMITTED'        
       ),0)      
     WHERE w.ward_id=p_ward_id; 
END; 
$$;

CREATE OR REPLACE FUNCTION low_stock_medicines(p_threshold integer DEFAULT NULL) 
RETURNS TABLE(
    medicine_id integer, 
    medicine_name varchar, 
    stock_quantity integer, 
    reorder_level integer, 
    shortage integer
) LANGUAGE sql AS $$     
    SELECT m.medicine_id, m.medicine_name, m.stock_quantity, m.reorder_level,            
           greatest(m.reorder_level-m.stock_quantity, 0) AS shortage     
    FROM medicine m     
    WHERE m.stock_quantity <= coalesce(p_threshold, m.reorder_level)     
    ORDER BY greatest(m.reorder_level-m.stock_quantity, 0) DESC, m.medicine_name; 
$$;