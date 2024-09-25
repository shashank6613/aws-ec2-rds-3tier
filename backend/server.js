const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(bodyParser.json()); // For parsing application/json
app.use(cors()); // Enable CORS

// PostgreSQL connection to primary database
const primaryPool = new Pool({
    host: process.env.PRIMARY_DB_HOST || 'primary-db-endpoint', // Replace with your primary DB endpoint
    user: process.env.DB_USER || 'admin',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || 'admin1234',
    database: process.env.DB_NAME || 'postgres', // Connect to the default database first
});

// PostgreSQL connection to read replica
const replicaPool = new Pool({
    host: process.env.REPLICA_DB_HOST || 'replica-db-endpoint', // Replace with your read replica DB endpoint
    user: process.env.DB_USER || 'admin',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || 'admin1234',
    database: process.env.DB_NAME || 'survey', // Connect to your target database
});

const dbName = process.env.DB_NAME || 'survey';

primaryPool.connect(async (err) => {
    if (err) {
        console.error('Failed to connect to the primary database:', err);
        process.exit(1); // Exit the application with failure code
    }
    console.log('Connected to primary database');

    try {
        // Create the database if it does not exist
        await primaryPool.query(`CREATE DATABASE ${dbName};`);
        console.log(`Database "${dbName}" created successfully.`);
    } catch (error) {
        if (error.code !== '42P04') { // Error code for "database already exists"
            console.error('Error creating database:', error);
            process.exit(1);
        } else {
            console.log(`Database "${dbName}" already exists.`);
        }
    } finally {
        await primaryPool.end(); // End the connection to the default database
    }

    // Create a new pool for the new database
    const newPool = new Pool({
        host: process.env.PRIMARY_DB_HOST || 'primary-db-endpoint',
        user: process.env.DB_USER || 'admin',
        port: process.env.DB_PORT || 5432,
        password: process.env.DB_PASSWORD || 'admin1234',
        database: dbName, // Connect to the newly created database
    });

    // Create table if not exists
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS "users" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INT NOT NULL,
        mobile VARCHAR(15) NOT NULL UNIQUE,
        nationality VARCHAR(50),
        language VARCHAR(50),
        pin VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    try {
        await newPool.query(createTableQuery);
        console.log('Table "users" created or already exists');
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    } finally {
        await newPool.end(); // Close the new pool connection
    }
});

// Route to handle form submissions
app.post('/submit', (req, res) => {
    const { name, age, mobile, nationality, language, pin } = req.body;

    // Basic validation
    if (!name || !age || !mobile || !nationality || !language || !pin) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // SQL query to insert data into the user table
    const insertQuery = `
    INSERT INTO "users" (name, age, mobile, nationality, language, pin)
    VALUES ($1, $2, $3, $4, $5, $6)`;

    primaryPool.query(insertQuery, [name, age, mobile, nationality, language, pin], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).json({ message: 'Error inserting data.' });
        }
        res.status(200).json({ message: 'User information submitted successfully!' });
    });
});

// Search endpoint using the read replica
app.get('/search', (req, res) => {
    const query = req.query.query;
    const sql = 'SELECT * FROM users WHERE name = $1 OR mobile = $2';

    replicaPool.query(sql, [query, query], (err, results) => {
        if (err) {
            console.error('Error executing query on read replica:', err.stack);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        if (results.rows.length > 0) {
            res.json(results.rows[0]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    });
});

// Custom error handler middleware
app.use((err, req, res, next) => {
    console.error('Unexpected error:', err);
    res.status(500).json({ message: 'An unexpected error occurred.' });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
