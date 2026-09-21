const db=require('../config/db');
exports.getAllRoom=async(req,res)=>
{
    try{
        const result=await db.query('SELECT * FROM room ORDER BY room_id ASC');
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

exports.createRoom = async (req, res) => {
  try {
    const { room_no, room_type, floor } = req.body;

    const result = await db.query(
      `INSERT INTO room (room_no, room_type, floor) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [room_no, room_type, floor]
    );
        res.status(201).json({
      success: true,
      message: 'room created successfully!',
      data: result.rows[0],
    });
    }catch(error){
      res.status(500).json({
            success:false,
            error:error.message
        });
    }
}