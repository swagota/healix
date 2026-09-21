-- HEALIX automatic database-side business rules.

CREATE OR REPLACE FUNCTION trg_validate_doctor_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM doctor_room_slot x
        WHERE x.doctor_id = NEW.doctor_id
          AND x.slot_id = NEW.slot_id
          AND x.assignment_id <> coalesce(NEW.assignment_id, -1)
    ) THEN
        RAISE EXCEPTION 'Doctor is already assigned to this time slot';
    END IF;

    IF EXISTS (
        SELECT 1 FROM doctor_room_slot x
        WHERE x.room_id = NEW.room_id
          AND x.slot_id = NEW.slot_id
          AND x.assignment_id <> coalesce(NEW.assignment_id, -1)
    ) THEN
        RAISE EXCEPTION 'Room is already assigned to this time slot';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_doctor_assignment ON doctor_room_slot;
CREATE TRIGGER validate_doctor_assignment
BEFORE INSERT OR UPDATE ON doctor_room_slot
FOR EACH ROW EXECUTE FUNCTION trg_validate_doctor_assignment();

CREATE OR REPLACE FUNCTION trg_validate_appointment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_day VARCHAR;
BEGIN
    SELECT ts.day INTO v_day
    FROM doctor_room_slot drs JOIN time_slot ts ON ts.slot_id = drs.slot_id
    WHERE drs.assignment_id = NEW.assignment_id;

    IF lower(trim(v_day)) <> lower(to_char(NEW.appointment_date, 'FMDay')) THEN
        RAISE EXCEPTION 'Appointment date does not match the assigned time slot day';
    END IF;

    IF upper(coalesce(NEW.status,'')) <> 'CANCELLED' AND EXISTS (
        SELECT 1 FROM appointment a
        WHERE a.assignment_id = NEW.assignment_id
          AND a.appointment_date = NEW.appointment_date
          AND a.appointment_id <> coalesce(NEW.appointment_id, -1)
          AND upper(coalesce(a.status,'')) <> 'CANCELLED'
    ) THEN
        RAISE EXCEPTION 'This appointment slot is already booked';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_appointment ON appointment;
CREATE TRIGGER validate_appointment
BEFORE INSERT OR UPDATE ON appointment
FOR EACH ROW EXECUTE FUNCTION trg_validate_appointment();

CREATE OR REPLACE FUNCTION trg_bed_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'ADMITTED' THEN
        UPDATE ward SET available_bed = available_bed - 1
        WHERE ward_id = NEW.ward_id AND available_bed > 0;
        IF NOT FOUND THEN RAISE EXCEPTION 'No available bed in ward %', NEW.ward_id; END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'ADMITTED' AND NEW.status <> 'ADMITTED' THEN
            UPDATE ward SET available_bed = available_bed + 1 WHERE ward_id = OLD.ward_id;
        ELSIF OLD.status <> 'ADMITTED' AND NEW.status = 'ADMITTED' THEN
            UPDATE ward SET available_bed = available_bed - 1 WHERE ward_id = NEW.ward_id AND available_bed > 0;
            IF NOT FOUND THEN RAISE EXCEPTION 'No available bed in ward %', NEW.ward_id; END IF;
        ELSIF OLD.status = 'ADMITTED' AND NEW.status = 'ADMITTED' AND OLD.ward_id <> NEW.ward_id THEN
            UPDATE ward SET available_bed = available_bed + 1 WHERE ward_id = OLD.ward_id;
            UPDATE ward SET available_bed = available_bed - 1 WHERE ward_id = NEW.ward_id AND available_bed > 0;
            IF NOT FOUND THEN RAISE EXCEPTION 'No available bed in ward %', NEW.ward_id; END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'ADMITTED' THEN
        UPDATE ward SET available_bed = available_bed + 1 WHERE ward_id = OLD.ward_id;
    END IF;
    RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS manage_bed_availability ON bed_assignment;
CREATE TRIGGER manage_bed_availability
AFTER INSERT OR UPDATE OR DELETE ON bed_assignment
FOR EACH ROW EXECUTE FUNCTION trg_bed_assignment();

CREATE OR REPLACE FUNCTION trg_bill_total()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_bill_id INTEGER;
BEGIN
    v_bill_id := coalesce(NEW.bill_id, OLD.bill_id);
    UPDATE bill
    SET total_amount = coalesce((SELECT sum(amount) FROM bill_item WHERE bill_id = v_bill_id), 0)
    WHERE bill_id = v_bill_id;
    RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_bill_total ON bill_item;
CREATE TRIGGER update_bill_total
AFTER INSERT OR UPDATE OR DELETE ON bill_item
FOR EACH ROW EXECUTE FUNCTION trg_bill_total();

CREATE OR REPLACE FUNCTION trg_prescription_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_qty INTEGER := 0;
    new_qty INTEGER := 0;
BEGIN
    IF TG_OP = 'INSERT' THEN
        new_qty := NEW.quantity;
        UPDATE medicine SET stock_quantity = stock_quantity - new_qty
        WHERE medicine_id = NEW.medicine_id AND stock_quantity >= new_qty;
        IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for medicine %', NEW.medicine_id; END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE medicine SET stock_quantity = stock_quantity + OLD.quantity WHERE medicine_id = OLD.medicine_id;
        RETURN OLD;
    ELSE
        old_qty := OLD.quantity;
        new_qty := NEW.quantity;
        IF OLD.medicine_id = NEW.medicine_id THEN
            IF new_qty > old_qty THEN
                UPDATE medicine SET stock_quantity = stock_quantity - (new_qty-old_qty)
                WHERE medicine_id = NEW.medicine_id AND stock_quantity >= (new_qty-old_qty);
                IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient additional stock for medicine %', NEW.medicine_id; END IF;
            ELSIF old_qty > new_qty THEN
                UPDATE medicine SET stock_quantity = stock_quantity + (old_qty-new_qty) WHERE medicine_id = NEW.medicine_id;
            END IF;
        ELSE
            UPDATE medicine SET stock_quantity = stock_quantity + old_qty WHERE medicine_id = OLD.medicine_id;
            UPDATE medicine SET stock_quantity = stock_quantity - new_qty
            WHERE medicine_id = NEW.medicine_id AND stock_quantity >= new_qty;
            IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for medicine %', NEW.medicine_id; END IF;
        END IF;
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS manage_medicine_stock ON prescription_medicine;
CREATE TRIGGER manage_medicine_stock
BEFORE INSERT OR UPDATE OR DELETE ON prescription_medicine
FOR EACH ROW EXECUTE FUNCTION trg_prescription_stock();
