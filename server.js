const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs").promises;
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json());
// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});

// Function to clean up data (remove commas from numbers)
const cleanData = (entry) => {
    return {
        ...entry,
        high: entry.high.replace(',', ''),
        low: entry.low.replace(',', ''),
        open: entry.open.replace(',', ''),
        close: entry.close.replace(',', ''),
    };
};


const insertDataFromJson = async () => {
    try {
        // Read and parse JSON file
        const data = await fs.readFile("./data.json", "utf-8");
        const jsonData = JSON.parse(data);

        // Check if data already exists in the database by checking a specific condition 
        const firstDate = jsonData[0].date; 
        const [existingData] = await pool.query(
            "SELECT COUNT(*) AS count FROM stocks WHERE date = ?", [firstDate]
        );

        if (existingData[0].count > 0) {
            console.log("Data already exists in the database, skipping insertion.");
            return; // Exit if data exists
        }

        // Insert each entry into the table
        const insertQuery = `
            INSERT INTO stocks (date, trade_code, high, low, open, close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        for (const entry of jsonData) {
            const cleanedEntry = cleanData(entry); 
            await pool.query(insertQuery, [
                cleanedEntry.date,
                cleanedEntry.trade_code,
                cleanedEntry.high,
                cleanedEntry.low,
                cleanedEntry.open,
                cleanedEntry.close,
                cleanedEntry.volume
            ]);
        }
        console.log("Data successfully inserted into MySQL table");
    } catch (err) {
        console.error("Error inserting data into MySQL:", err);
    }
};


// Route for fetching paginated data
app.get("/data", async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * Number(limit);

        // Fetch data from the 'stocks' table
        const [rows] = await pool.query(
            "SELECT * FROM stocks ORDER BY date DESC LIMIT ? OFFSET ?", 
            [Number(limit), offset]
        );

        res.json(rows);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});


// update route for row update

app.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    let { date, trade_code, high, low, open, close, volume } = req.body;
  
    // Validate required fields
    if (!id || !date || !trade_code || !high || !low || !open || !close || !volume) {
      return res.status(400).json({ error: 'Missing required fields!' });
    }
  
    try {
      // Convert date to MySQL format
      const formattedDate = new Date(date).toISOString().slice(0, 19).replace("T", " ");
  
      // Ensure numeric values are properly formatted
      high = parseFloat(high);
      low = parseFloat(low);
      open = parseFloat(open);
      close = parseFloat(close);
      volume = parseInt(volume.toString().replace(/,/g, ""), 10); 
  
      // Execute the update query
      const [result] = await pool.query(
        'UPDATE stocks SET date=?, trade_code=?, high=?, low=?, open=?, close=?, volume=? WHERE id=?',
        [formattedDate, trade_code, high, low, open, close, volume, id]
      );
  
      if (result.affectedRows > 0) {
        res.status(200).json({ success: 'Successfully updated row!' });
      } else {
        res.status(404).json({ error: 'Row not found!' });
      }
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Database error!' });
    }
  });
  
  

//delete route for row deletion

app.delete('/delete/:id', async (req,res)=>{
    const {id}=req.params;
    if(!id || isNaN(id)){
        return res.status(500).json({error:'invalid id'})
    }
    try{
     const [result]=await pool.query('DELETE FROM stocks WHERE id=?',[id]);
     if(result.affectedRows>0){
        res.status(200).json({
            success: 'row deleted successfully!'
        })
        
     }
     else {
        res.status(404).json({error:'row not found!'});
    }
    }
    catch(error){
        console.error('Error deleting data',error);
        res.status(500).json({error: 'Internal server error!'});
    }
})

// Start the server and insert data on startup
const PORT = 5000;
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await insertDataFromJson(); 
});
