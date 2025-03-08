const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs").promises;
require('dotenv').config();
const app = express();
app.use(cors());

// Create MySQL connection pool
const pool = mysql.createPool({
    host: "localhost", // Change this to your DB host
    user: "root", // Change this to your DB user
    password: process.env.MYSQL_PASSWORD, // Change this to your DB password
    database: "stock_data", // Change this to your DB name
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

// Function to insert data from JSON file into MySQL table
// Function to insert data from JSON file into MySQL table
const insertDataFromJson = async () => {
    try {
        // Read and parse JSON file
        const data = await fs.readFile("./data.json", "utf-8");
        const jsonData = JSON.parse(data);

        // Check if data already exists in the database by checking a specific condition (e.g., first date in the file)
        const firstDate = jsonData[0].date; // Get the first date from the JSON
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
            const cleanedEntry = cleanData(entry); // Clean data before inserting
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

// Start the server and insert data on startup
const PORT = 5000;
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await insertDataFromJson(); // Insert data from JSON on server startup
});
