require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.MYSQL_PASSWORD,
    database: 'stock_data'
});

// Check if the connection is established
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Function to fetch data from JSON and insert into database
const insertData = async () => {
    try {
        // Read data from JSON file
        const data = await fs.promises.readFile('./data.json', 'utf-8');
        const jsonData = JSON.parse(data);

        // Insert JSON data into MySQL
        for (const entry of jsonData) {
            await connection.execute(
                'INSERT INTO stocks(date, trade_code, high, low, open, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    entry.date,
                    entry.trade_code,
                    parseFloat(entry.high.replace(/,/g, '')),
                    parseFloat(entry.low.replace(/,/g, '')),
                    parseFloat(entry.open.replace(/,/g, '')),
                    parseFloat(entry.close.replace(/,/g, '')),
                    parseInt(entry.volume.replace(/,/g, ''), 10)
                ]
            );
        }

        console.log('Data inserted into stocks table.');
    } catch (err) {
        console.error('Error inserting data:', err);
    }
};

// Fetch data and insert into the table when server starts
insertData();

// Route to fetch and paginate stock data
app.get('/data', async (req, res) => {
    try {
        let { page = 1, limit = 50 } = req.query;
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        const offset = (page - 1) * limit;

        // Fetch paginated data
        const [rows] = await connection.execute(
            'SELECT * FROM stocks LIMIT ? OFFSET ?',
            [limit, offset]
        );

        res.json(rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
