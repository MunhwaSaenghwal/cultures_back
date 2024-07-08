const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const upload2 = multer();

app.use(bodyParser.json());
app.use(express.json());
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create a connection to the database
const db = mysql.createConnection({
    host: '15.165.64.45', // Replace with your database host
    user: 'bada', // Replace with your database user
    password: 'ghdqkek0715', // Replace with your database password
    database: 'cultures'
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
    exec('venv/bin/python3 trends.py', (error, stdout, stderr) => {
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
    //if (!name || !profileImage) {
      //  return res.status(400).send('Name and profile image are required.');
    //}
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
/*
const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const upload2 = multer();

app.use(bodyParser.json());
app.use(express.json());

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create a connection to the database
const db = mysql.createConnection({
    host: '15.165.64.45',
    user: 'bada',
    password: 'ghdqkek0715',
    database: 'cultures'
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
    exec('venv/bin/python3 trends.py', (error, stdout, stderr) => {
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

// Endpoint to update user information
app.put('/users/:name', upload.single('profileImage'), (req, res) => {
    const { name } = req.params;
    const { description, reviewed_books, read_books } = req.body;
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
        let existingReviewedBooks = [];
        let existingReadBooks = [];
        try {
            existingReviewedBooks = JSON.parse(currentUser.reviewed_books || '[]');
            existingReadBooks = JSON.parse(currentUser.read_books || '[]');
        } catch (e) {
            console.error('Error parsing existing books data:', e);
        }

        // Merge reviewed_books
        if (reviewed_books) {
            const newReviewedBooks = JSON.parse(reviewed_books);
            newReviewedBooks.forEach(newBook => {
                const index = existingReviewedBooks.findIndex(book => book.ISBN === newBook.ISBN);
                if (index !== -1) {
                    existingReviewedBooks[index] = newBook;
                } else {
                    existingReviewedBooks.push(newBook);
                }
            });
        }

        // Merge read_books
        if (read_books) {
            const newReadBooks = JSON.parse(read_books);
            existingReadBooks = [...new Set([...existingReadBooks, ...newReadBooks])];
        }

        const updateSql = 'UPDATE users SET profileImage = IFNULL(?, profileImage), description = ?, reviewed_books = ?, read_books = ? WHERE name = ?';
        db.query(updateSql, [profileImage, updatedDescription, JSON.stringify(existingReviewedBooks), JSON.stringify(existingReadBooks), name], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error updating user:', updateErr);
                return res.status(500).send(updateErr);
            }
            console.log(`User ${name} updated successfully`);
            res.send({
                name,
                profileImage: profileImage ? profileImage.toString('base64') : null,
                description: updatedDescription,
                reviewed_books: existingReviewedBooks,
                read_books: existingReadBooks
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
        user.reviewed_books = JSON.parse(user.reviewed_books || '[]');
        user.read_books = JSON.parse(user.read_books || '[]');
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
        results.forEach(user => {
            if (user.profileImage) {
                user.profileImage = user.profileImage.toString('base64');
            }
            user.reviewed_books = JSON.parse(user.reviewed_books || '[]');
            user.read_books = JSON.parse(user.read_books || '[]');
        });
        res.send(results);
    });
});

// Endpoint to upload image
app.post('/upload', (req, res) => {
    const { name, profileImage, description } = req.body;
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
});*/


// Endpoint to update user information
app.put('/users/:name', upload.single('profileImage'), (req, res) => {
    const { name } = req.params;
    const { description, reviewed_books, read_books } = req.body;
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
        let existingReviewedBooks;
        let existingReadBooks;
        try {
            existingReviewedBooks = typeof currentUser.reviewed_books === 'string' ? JSON.parse(currentUser.reviewed_books) : currentUser.reviewed_books;

            //existingReviewedBooks = JSON.parse(currentUser.reviewed_books);
            existingReadBooks = typeof currentUser.read_books === 'string' ? JSON.parse(currentUser.read_books) : currentUser.read_books;
	    //existingReadBooks = JSON.parse(currentUser.read_books);
            console.log('Existing books parsed successfully');
	} catch (e) {
	    console.error('Error parsing existing books data:', e);
            console.error('Reviewed Books:', currentUser.reviewed_books);
            console.error('Read Books:', currentUser.read_books);
            return res.status(500).send('Error parsing existing books data');
        }

        // Merge reviewed_books
        const newReviewedBooks = reviewed_books ? JSON.parse(reviewed_books) : [];
        newReviewedBooks.forEach(newBook => {
            const index = existingReviewedBooks.findIndex(book => book.ISBN === newBook.ISBN);
            if (index !== -1) {
                // Update existing book review
                existingReviewedBooks[index] = newBook;
            } else {
                // Add new book review
                existingReviewedBooks.push(newBook);
            }
        });

        // Merge read_books
        const newReadBooks = read_books ? JSON.parse(read_books) : [];
        newReadBooks.forEach(newISBN => {
            if (!existingReadBooks.includes(newISBN)) {
                existingReadBooks.push(newISBN);
            }
        });

        const updateSql = 'UPDATE users SET profileImage = ?, description = ?, reviewed_books = ?, read_books = ? WHERE name = ?';
        db.query(updateSql, [profileImage || currentUser.profileImage, updatedDescription, JSON.stringify(existingReviewedBooks), JSON.stringify(existingReadBooks), name], (updateErr, updateResult) => {
            if (updateErr) {
                return res.status(500).send(updateErr);
            }
           console.log(`User ${name} updated successfully`);
           res.send({
                name,
                profileImage: profileImage ? profileImage.toString('base64') : currentUser.profileImage ? currentUser.profileImage.toString('base64') : null,
                description: updatedDescription,
                reviewed_books: existingReviewedBooks,
                read_books: existingReadBooks
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
        //user.profileImage = user.profileImage ? user.profileImage.toString('base64') : null;
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
		//user.reviewed_books = JSON.stringify(user.reviewed_books);
		//user.reviewed_books = JSON.parse(user.reviewed_books);
		//user.read_books = JSON.stringify(user.read_books);
                //user.read_books = JSON.parse(user.read_books);
		//user.reviewed_books = user.reviewed_books ? JSON.parse(user.reviewed_books) : [];
                //user.read_books = user.read_books ? JSON.parse(user.read_books) : [];
                if (user.profileImage) {
             		user.profileImage = user.profileImage.toString('base64');
            	}
		//user.profileImage = user.profileImage ? user.profileImage.toString('base64') : null;
            });
        } catch (e) {
	    console.error('Error parsing books data:', e);
            return res.status(500).send('Error parsing books data');
        }
        res.send(results);
    });
});

/*
// Endpoint to upload and insert image path into the database
app.post('/upload', upload.single('profileImage'), (req, res) => {
    const { name } = req.body;
    const profileImagePath = req.file ? req.file.path : null;

    if (!name || !profileImagePath) {
        return res.status(400).send('Name and image are required.');
    }

    const sql = 'INSERT INTO users (name, profileImagePath) VALUES (?, ?) ON DUPLICATE KEY UPDATE profileImagePath = VALUES(profileImagePath)';
    pool.query(sql, [name, profileImagePath], (err, result) => {
        if (err) {
            console.error('Error inserting image path:', err);
            return res.status(500).send(err);
        }
        console.log(`Image for user ${name} uploaded at path ${profileImagePath}`);
        res.send({ name, profileImagePath });
    });
});*/

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

