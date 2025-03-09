const fs = require("fs").promises;
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); 

// Route for getting paginated data
app.get("/data", async (req, res) => {
    try {
        // Default to page 1 and limit 50 if not provided
        const { page = 1, limit = 50 } = req.query;
        
        // Read and parse the JSON data
        const data = await fs.readFile("./data.json", "utf-8");
        const jsonData = JSON.parse(data); 

        // Calculate the range of data to send (pagination)
        const startIndex = (page - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);

        // Paginate the data
        const paginatedData = jsonData.slice(startIndex, endIndex);

        // Send the paginated data as response
        res.json(paginatedData);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Failed to load data" });
    }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
