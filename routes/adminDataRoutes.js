const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();

const resources = {
  departments: {
    table:'department', id:'department_id', fields:['department_name','floor'], order:'department_id'
  },
  specializations: {
    table:'specialization', id:'specialization_id', fields:['specialization_name'], order:'specialization_id'
  },
  rooms: {
    table:'room', id:'room_id', fields:['room_no','room_type','floor'], order:'room_id'
  },
  wards: {
    table:'ward', id:'ward_id', fields:['ward_name','ward_type','floor','total_bed','available_bed','discharge_date'], order:'ward_id'
  },
  'time-slots': {
    table:'time_slot', id:'slot_id', fields:['day','start_time','end_time'], order:'slot_id'
  },
  medicines: {
    table:'medicine', id:'medicine_id', fields:['medicine_name','generic_name','unit_price','stock_quantity','reorder_level'], order:'medicine_id'
  },
  'bed-assignments': {
    table:'bed_assignment', id:'bed_assignment_id', fields:['patient_id','ward_id','admission_date','discharge_date','status'], order:'bed_assignment_id',
    select:`SELECT ba.*, p.patient_name, w.ward_name FROM bed_assignment ba JOIN patient p ON p.patient_id=ba.patient_id JOIN ward w ON w.ward_id=ba.ward_id ORDER BY ba.bed_assignment_id`
  },
  staff: {
    table:'staff', id:'staff_id', fields:['staff_name','staff_password','role','staff_phone','staff_email','staff_salary'], order:'staff_id', staff:true
  }
};

function getConfig(name){ return resources[name]; }
function cleanBody(body, fields){ return fields.map(f => body[f] === '' ? null : body[f]); }

router.get('/:resource', async (req,res)=>{
  const cfg=getConfig(req.params.resource); if(!cfg) return res.status(404).json({message:'Resource not found'});
  try{ const result=await db.query(cfg.select || (cfg.staff ? `SELECT staff_id,staff_name,role,staff_phone,staff_email,staff_salary FROM staff ORDER BY staff_id` : `SELECT * FROM ${cfg.table} ORDER BY ${cfg.order}`)); res.json(result.rows); }
  catch(e){ console.error(e); res.status(500).json({message:`Failed to fetch ${req.params.resource}`,error:e.message}); }
});

router.post('/:resource', async (req,res)=>{
  const cfg=getConfig(req.params.resource); if(!cfg) return res.status(404).json({message:'Resource not found'});
  try{
    let body={...req.body};
    if(cfg.staff && body.staff_password) body.staff_password=await bcrypt.hash(body.staff_password,10);
    const values=cleanBody(body,cfg.fields);
    const placeholders=cfg.fields.map((_,i)=>`$${i+1}`).join(',');
    const result=await db.query(`INSERT INTO ${cfg.table} (${cfg.fields.join(',')}) VALUES (${placeholders}) RETURNING *`,values);
    res.status(201).json(result.rows[0]);
  }catch(e){ console.error(e); res.status(400).json({message:`Failed to create ${req.params.resource}`,error:e.message}); }
});

router.put('/:resource/:id', async (req,res)=>{
  const cfg=getConfig(req.params.resource); if(!cfg) return res.status(404).json({message:'Resource not found'});
  try{
    let body={...req.body};
    if(cfg.staff && body.staff_password) body.staff_password=await bcrypt.hash(body.staff_password,10);
    if(cfg.staff && !body.staff_password){
      const old=await db.query('SELECT staff_password FROM staff WHERE staff_id=$1',[req.params.id]);
      if(!old.rows.length) return res.status(404).json({message:'Record not found'});
      body.staff_password=old.rows[0].staff_password;
    }
    const values=cleanBody(body,cfg.fields);
    const assignments=cfg.fields.map((f,i)=>`${f}=$${i+1}`).join(', ');
    const result=await db.query(`UPDATE ${cfg.table} SET ${assignments} WHERE ${cfg.id}=$${values.length+1} RETURNING ${cfg.staff?'staff_id,staff_name,role,staff_phone,staff_email,staff_salary':'*'}`,[...values,req.params.id]);
    if(!result.rows.length) return res.status(404).json({message:'Record not found'});
    res.json(result.rows[0]);
  }catch(e){ console.error(e); res.status(400).json({message:`Failed to update ${req.params.resource}`,error:e.message}); }
});

router.delete('/:resource/:id', async (req,res)=>{
  const cfg=getConfig(req.params.resource); if(!cfg) return res.status(404).json({message:'Resource not found'});
  try{ const result=await db.query(`DELETE FROM ${cfg.table} WHERE ${cfg.id}=$1 RETURNING *`,[req.params.id]); if(!result.rows.length)return res.status(404).json({message:'Record not found'}); res.json({message:'Deleted successfully',data:result.rows[0]}); }
  catch(e){ console.error(e); res.status(400).json({message:`Failed to delete ${req.params.resource}`,error:e.message}); }
});

module.exports=router;
