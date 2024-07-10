const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const upload2 = multer();
require('dotenv').config();

app.use(bodyParser.json());
app.use(express.json());

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create a connection to the database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
	throw err;
    }
    console.log('Connected to database');
});

// Define a route for the root URL
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.send('Welcome to the Book Review API');
});

// Endpoint to google API
app.get('/trending_keywords', (req, res) => {
	const command = 'venv/bin/python3 trends.py';
	const execOptions = { timeout: 3000 };
    exec(command, execOptions, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).send('Error fetching Google Trends data');
            return;
        }
        const keywords = stdout.trim().split('\n');
        res.json(keywords);
    });
});

// Endpoint to create a new user with an image
app.post('/users', upload.single('profileImage'), (req, res) => {
    const { name, description } = req.body;
    const profileImage = req.file ? req.file.buffer : null;
    if (!name || !profileImage) {
        return res.status(400).send('Name and profile image are required.');
    }
    const sql = 'INSERT INTO users (name, profileImage, description, reviewed_books, read_books) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, profileImage, description, JSON.stringify([]), JSON.stringify([])], (err, result) => {
        if (err) {
	    console.error('Error inserting user:', err);
            return res.status(500).send(err);
        }
	console.log(`User ${name} created`);
        res.json({ 
            name,
            description,
	    profileImage: profileImage.toString('base64'),
            reviewed_books: [],
            read_books: []
        });
    });
});

app.put('/users/:name', upload.single('profileImage'), (req, res) => {
    const { name } = req.params;
    let userData;
    try {
        userData = JSON.parse(req.body.userData);
    } catch (e) {
        console.error('Error parsing userData:', e);
        return res.status(400).send('Invalid userData format');
    }
    const { description, reviewed_books, read_books } = userData;
    const profileImage = req.file ? req.file.buffer : null;

    // Retrieve current user data
    const selectSql = 'SELECT * FROM users WHERE name = ?';
    db.query(selectSql, [name], (selectErr, selectResults) => {
        if (selectErr) {
            console.error('Error selecting user:', selectErr);
            return res.status(500).send(selectErr);
        }
        if (selectResults.length === 0) {
            console.log(`User ${name} not found`);
            return res.status(404).send('User not found');
        }

        const currentUser = selectResults[0];
        const updatedDescription = description || currentUser.description;

        // Parse existing reviewed_books and read_books
	const updateSql = 'UPDATE users SET profileImage = IFNULL(?, profileImage), description = ?, reviewed_books = ?, read_books = ? WHERE name = ?';
        db.query(updateSql, [
            profileImage, 
            updatedDescription, 
            JSON.stringify(reviewed_books), 
            JSON.stringify(read_books), 
            name
        ], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error updating user:', updateErr);
                return res.status(500).send(updateErr);
            }
            console.log(`User ${name} updated successfully`);
            res.send({
                name,
                profileImage: profileImage ? profileImage.toString('base64') : currentUser.profileImage ? currentUser.profileImage.toString('base64') : null,
                description: updatedDescription,
                reviewed_books: reviewed_books,
                read_books: read_books
            });
        });

    });
});

// Endpoint to get user details
app.get('/users/:name', (req, res) => {
    const { name } = req.params;
    console.log(`Searching for user with name: "${name}"`);
    const sql = 'SELECT * FROM users WHERE name = ?';
    db.query(sql, [name], (err, results) => {
        if (err) {
                console.error('Error selecting user:', err);
		return res.status(500).send(err);
        }
        if (results.length === 0) {
                console.log(`User ${name} not found`);
		return res.status(404).send('User not found');
        }
        const user = results[0];
	console.log('Fetched user data:', user);
	if (user.profileImage) {
            user.profileImage = user.profileImage.toString('base64');
        }
        res.send(user);
    });
});

// Endpoint to get all users
app.get('/users', (req, res) => {
    const sql = 'SELECT * FROM users';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error selecting users:', err);
            return res.status(500).send(err);
        }
        console.log('Database results:', results);
        try {
            results.forEach(user => {
		console.log(`Parsing books data for user ${user.name}`);
		if (typeof user.reviewed_books === 'string') {
                    try {
                        user.reviewed_books = JSON.parse(user.reviewed_books);
			console.log('Reviewed books parsed:', user.reviewed_books);
                    } catch (parseError) {
                        console.error('Error parsing reviewed_books:', parseError);
                        user.reviewed_books = [];
                    }
                } else if (Array.isArray(user.reviewed_books)) {
                    console.log('Reviewed books already parsed:', user.reviewed_books);
                } else {
                    user.reviewed_books = [];
                }

                if (typeof user.read_books === 'string') {
                    try {
                        user.read_books = JSON.parse(user.read_books);
			console.log('Read books parsed:', user.read_books);
                    } catch (parseError) {
                        console.error('Error parsing read_books:', parseError);
                        user.read_books = [];
                    }
                } else if (Array.isArray(user.read_books)) {
                    console.log('Read books already parsed:', user.read_books);
                } else {
                    user.read_books = [];
                }
                if (user.profileImage) {
             		user.profileImage = user.profileImage.toString('base64');
            	}
            });
        } catch (e) {
	    console.error('Error parsing books data:', e);
            return res.status(500).send('Error parsing books data');
        }
        res.send(results);
    });
});

// Endpoint to upload image
app.post('/upload', (req, res) => {
    const { name, profileImage } = req.body;
    if (!name || !profileImage) {
        return res.status(400).send('Name and profile image are required.');
    }

    // Decode base64 image
    const imageBuffer = Buffer.from(profileImage, 'base64');

    const sql = 'INSERT INTO users (name, profileImage, description, reviewed_books, read_books) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE profileImage = VALUES(profileImage)';
    db.query(sql, [name, imageBuffer, description, JSON.stringify([]), JSON.stringify([])], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).send(err);
        }
        console.log(`User ${name} created/updated with image`);
        res.send({ name });
    });
});

// Endpoint to upload image with file upload
app.post('/uploadFile', upload.single('profileImage'), (req, res) => {
    const { name, description } = req.body;
    if (!name || !req.file) {
        return res.status(400).send('Name and profile image are required.');
    }

    // Get the binary image data from multer
    const imageBuffer = req.file.buffer;

    // Insert the user data into the database
    const sql = `
        INSERT INTO users (name, profileImage, description, reviewed_books, read_books)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE profileImage = VALUES(profileImage), description = VALUES(description);
    `;
    db.query(sql, [name, imageBuffer, description, JSON.stringify([]), JSON.stringify([])], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).send(err);
        }
        console.log(`User ${name} created/updated with image`);
        res.send({ name });
    });
});

// Endpoint to serve the profile image
app.get('/users/:name/profileImage', (req, res) => {
    const { name } = req.params;
    console.log(`Searching for profile image of user with name: "${name}"`);
    const sql = 'SELECT profileImage FROM users WHERE name = ?';
    db.query(sql, [name], (err, results) => {
        if (err) {
            console.error('Error selecting user:', err);
            return res.status(500).send(err);
        }
        if (results.length === 0 || !results[0].profileImage) {
            console.log(`Profile image for user ${name} not found`);
            return res.status(404).send('Profile image not found');
        }
        const profileImage = results[0].profileImage;
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': profileImage.length
        });
        res.end(profileImage);
    });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

