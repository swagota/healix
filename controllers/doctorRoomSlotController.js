const db=require('../config/db');
exports.getAllDoctorRoomSlots=async(req,res)=>
{
    try{
        const result = await db.query(`
      SELECT 
        drs.assignment_id,
        d.doctor_id,
        d.doctor_name,
        r.room_id,
        r.room_no,
        ts.slot_id,
        ts.day,
        ts.start_time,
        ts.end_time
      FROM doctor_room_slot drs
      JOIN doctor d ON drs.doctor_id = d.doctor_id
      JOIN room r ON drs.room_id = r.room_id
      JOIN time_slot ts ON drs.slot_id = ts.slot_id
      ORDER BY drs.assignment_id ASC
    `);
        res.status(200).json({
            success:true,
            data:result.rows
        });
    }catch(error){
        res.status(500).json({
            success:false,
            error:error.message
        });
    }
};

exports.createDoctorRoomSlot = async (req, res) => {
  try {
    const { doctor_id, room_id, slot_id } = req.body;

    const result = await db.query(
      `INSERT INTO doctor_room_slot (doctor_id, room_id, slot_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [doctor_id, room_id, slot_id]
    );
        res.status(201).json({
      success: true,
      message: 'Doctor assigned to room and slot successfully!',
      data: result.rows[0],
    });
    }catch(error){
      res.status(500).json({
            success:false,
            error:error.message
        });
    }
}