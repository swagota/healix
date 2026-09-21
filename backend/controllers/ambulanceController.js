const pool = require("../config/db");

const getFleet = async (req,res) => {
  try {
    const r = await pool.query(`SELECT ambulance_id, ambulance_no, ambulance_type, status, active FROM ambulance ORDER BY ambulance_id`);
    const total = r.rows.filter(x=>x.active).length;
    const available = r.rows.filter(x=>x.active && x.status==='AVAILABLE').length;
    res.json({ total, available, rate_per_km: 50, ambulances:r.rows });
  } catch(e){ console.error(e); res.status(500).json({message:'Failed to fetch ambulance fleet'}); }
};

const getRate = async (req,res) => res.json({rate_per_km:50});

const createAmbulance = async (req,res) => {
  try {
    const { ambulance_no, ambulance_type='Standard' }=req.body;
    if(!ambulance_no) return res.status(400).json({message:'Ambulance number is required'});
    const r=await pool.query(`INSERT INTO ambulance(ambulance_no,ambulance_type) VALUES($1,$2) RETURNING *`,[ambulance_no.trim(),ambulance_type]);
    res.status(201).json(r.rows[0]);
  }catch(e){ console.error(e); res.status(400).json({message:e.code==='23505'?'Ambulance number already exists':'Failed to add ambulance'}); }
};

const updateAmbulance = async (req,res) => {
  try {
    const id=Number(req.params.id); const {ambulance_no,ambulance_type,status,active}=req.body;
    const r=await pool.query(`UPDATE ambulance SET ambulance_no=COALESCE($1,ambulance_no), ambulance_type=COALESCE($2,ambulance_type), status=COALESCE($3,status), active=COALESCE($4,active) WHERE ambulance_id=$5 RETURNING *`,[ambulance_no||null,ambulance_type||null,status||null,active===undefined?null:Boolean(active),id]);
    if(!r.rows.length) return res.status(404).json({message:'Ambulance not found'}); res.json(r.rows[0]);
  }catch(e){ console.error(e); res.status(400).json({message:'Failed to update ambulance'}); }
};

const getBookings = async (req,res) => {
  try {
    const r=await pool.query(`SELECT ab.*, p.patient_name, p.patient_phone, a.ambulance_no, a.ambulance_type, b.total_amount AS billed_amount, b.payment_status, b.bill_id AS linked_bill_id FROM ambulance_booking ab JOIN patient p ON p.patient_id=ab.patient_id LEFT JOIN ambulance a ON a.ambulance_id=ab.ambulance_id LEFT JOIN LATERAL (SELECT bill_id, total_amount, payment_status FROM bill WHERE ambulance_booking_id=ab.booking_id ORDER BY bill_id DESC LIMIT 1) b ON TRUE ORDER BY ab.booking_date DESC, ab.booking_time DESC, ab.booking_id DESC`);
    res.json(r.rows);
  }catch(e){console.error(e);res.status(500).json({message:'Failed to fetch ambulance bookings'});}
};

const getPatientBookings = async (req,res) => {
  try { const id=Number(req.params.id); const r=await pool.query(`SELECT ab.*, a.ambulance_no, a.ambulance_type, b.bill_id, b.total_amount AS billed_amount, b.payment_status FROM ambulance_booking ab LEFT JOIN ambulance a ON a.ambulance_id=ab.ambulance_id LEFT JOIN LATERAL (SELECT bill_id,total_amount,payment_status FROM bill WHERE ambulance_booking_id=ab.booking_id ORDER BY bill_id DESC LIMIT 1) b ON TRUE WHERE ab.patient_id=$1 ORDER BY ab.booking_id DESC`,[id]); res.json(r.rows); }
  catch(e){console.error(e);res.status(500).json({message:'Failed to fetch your ambulance bookings'});}
};

const createBooking = async (req,res) => {
  const client=await pool.connect();
  try {
    const patientId=Number(req.user.id); const {booking_date,booking_time,pickup_location,destination,notes}=req.body;
    if(!booking_date||!booking_time||!pickup_location||!destination) return res.status(400).json({message:'Date, time, pickup location and destination are required'});
    await client.query('BEGIN');
    const fleet=await client.query(`SELECT ambulance_id FROM ambulance WHERE active=TRUE AND status='AVAILABLE' ORDER BY ambulance_id FOR UPDATE SKIP LOCKED LIMIT 1`);
    if(!fleet.rows.length){ await client.query('ROLLBACK'); return res.status(409).json({message:'No ambulance is currently available. Please try another time.'}); }
    const amb=fleet.rows[0].ambulance_id;
    await client.query(`UPDATE ambulance SET status='RESERVED' WHERE ambulance_id=$1`,[amb]);
    const r=await client.query(`INSERT INTO ambulance_booking(patient_id,ambulance_id,booking_date,booking_time,pickup_location,destination,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[patientId,amb,booking_date,booking_time,pickup_location.trim(),destination.trim(),notes||null]);
    await client.query('COMMIT'); res.status(201).json(r.rows[0]);
  }catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e);res.status(500).json({message:'Failed to submit ambulance request'});}finally{client.release();}
};

const updateBooking = async (req,res) => {
  const client=await pool.connect();
  try {
    const id=Number(req.params.id); const {status,ambulance_id,actual_distance_km}=req.body;
    await client.query('BEGIN');
    const current=(await client.query(`SELECT * FROM ambulance_booking WHERE booking_id=$1 FOR UPDATE`,[id])).rows[0];
    if(!current){await client.query('ROLLBACK');return res.status(404).json({message:'Booking not found'});}
    const nextStatus=String(status||current.status).toUpperCase();
    // A completed booking is final. Re-saving it must never create another bill or another row.
    if (String(current.status).toUpperCase() === 'COMPLETED') {
      if (nextStatus !== 'COMPLETED') { await client.query('ROLLBACK'); return res.status(400).json({message:'A completed ambulance booking cannot be moved back to another status.'}); }
      const existingBill = current.bill_id ? (await client.query(`SELECT bill_id,total_amount,payment_status FROM bill WHERE bill_id=$1`,[current.bill_id])).rows[0] : null;
      if (existingBill) { await client.query('COMMIT'); return res.json({booking:current,bill:existingBill,message:'Booking is already completed. Existing ambulance bill was kept.'}); }
    }
    if(nextStatus==='REJECTED' || nextStatus==='CANCELLED'){
      await client.query(`UPDATE ambulance SET status='AVAILABLE' WHERE ambulance_id=$1 AND active=TRUE`,[current.ambulance_id]);
      await client.query(`UPDATE ambulance_booking SET status=$1, assigned_staff_id=$2 WHERE booking_id=$3`,[nextStatus,req.user.id,id]);
      await client.query('COMMIT'); return res.json({message:`Booking ${nextStatus.toLowerCase()}`,booking:{...current,status:nextStatus}});
    }
    if(nextStatus==='APPROVED'){
      const aid=Number(ambulance_id||current.ambulance_id);
      const available=await client.query(`SELECT ambulance_id FROM ambulance WHERE ambulance_id=$1 AND active=TRUE AND status IN ('AVAILABLE','RESERVED') FOR UPDATE`,[aid]);
      if(!available.rows.length){await client.query('ROLLBACK');return res.status(409).json({message:'Selected ambulance is not available for assignment.'});}
      const overlap=await client.query(`SELECT 1 FROM ambulance_booking WHERE ambulance_id=$1 AND booking_id<>$2 AND booking_date=$3 AND status IN ('PENDING','APPROVED','IN_SERVICE') AND booking_time BETWEEN ($4::time - interval '59 minutes') AND ($4::time + interval '59 minutes') LIMIT 1`,[aid,id,current.booking_date,current.booking_time]);
      if(overlap.rows.length) {await client.query('ROLLBACK');return res.status(409).json({message:'That ambulance is already reserved around the requested time.'});}
      await client.query(`UPDATE ambulance SET status='RESERVED' WHERE ambulance_id=$1 AND active=TRUE`,[aid]);
      await client.query(`UPDATE ambulance SET status='AVAILABLE' WHERE ambulance_id=$1 AND ambulance_id<>$2 AND status='RESERVED'`,[current.ambulance_id,aid]);
      const r=await client.query(`UPDATE ambulance_booking SET status='APPROVED', ambulance_id=$1, assigned_staff_id=$2 WHERE booking_id=$3 RETURNING *`,[aid,req.user.id,id]); await client.query('COMMIT'); return res.json(r.rows[0]);
    }
    if(nextStatus==='IN_SERVICE'){ const r=await client.query(`UPDATE ambulance_booking SET status='IN_SERVICE', assigned_staff_id=$1 WHERE booking_id=$2 RETURNING *`,[req.user.id,id]); await client.query('COMMIT'); return res.json(r.rows[0]); }
    if(nextStatus==='COMPLETED'){
      const distance=Number(actual_distance_km); if(!Number.isFinite(distance)||distance<=0){await client.query('ROLLBACK');return res.status(400).json({message:'Actual total distance (km) is required after the service.'});}
      const amount=Math.round(distance*Number(current.rate_per_km)*100)/100;
      const r=await client.query(`UPDATE ambulance_booking SET status='COMPLETED', actual_distance_km=$1, final_amount=$2, assigned_staff_id=$3, completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP) WHERE booking_id=$4 RETURNING *`,[distance,amount,req.user.id,id]);
      let bill;
      if (current.bill_id) {
        bill = await client.query(`SELECT bill_id,total_amount,payment_status FROM bill WHERE bill_id=$1`,[current.bill_id]);
      } else {
        bill = await client.query(`INSERT INTO bill(total_amount,payment_method,payment_status,payment_date,appointment_id,ambulance_booking_id) VALUES($1,NULL,'Pending',NULL,NULL,$2) RETURNING bill_id,total_amount,payment_status`,[amount,id]);
        await client.query(`UPDATE ambulance_booking SET bill_id=$1 WHERE booking_id=$2`,[bill.rows[0].bill_id,id]);
      }
      await client.query(`UPDATE ambulance SET status='AVAILABLE' WHERE ambulance_id=$1`,[current.ambulance_id]);
      await client.query('COMMIT'); return res.json({booking:r.rows[0],bill:bill.rows[0],message:`Service completed. Final ambulance bill is ৳${amount.toFixed(2)}.`});
    }
    await client.query('ROLLBACK'); return res.status(400).json({message:'Unsupported booking status'});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e);res.status(500).json({message:'Failed to update ambulance booking'});}finally{client.release();}
};

module.exports={getFleet,getRate,createAmbulance,updateAmbulance,getBookings,getPatientBookings,createBooking,updateBooking};
