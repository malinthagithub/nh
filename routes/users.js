const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Your database connection

const router = express.Router();

// 🔹 Register Route (Registers as 'guest' by default, unless 'owner' or 'clerk' is specified)
router.post('/register', async (req, res) => {
    const { username, email, password, role, security_key } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
            if (err) {
                return res.status(500).json({ message: `Database error: ${err.message}` });
            }

            if (result.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Set default role to 'guest' if not provided or if role is not valid
            let userRole = role && (role === 'owner' || role === 'clerk') ? role : 'guest';

            if ((userRole === 'owner' || userRole === 'clerk') && !security_key) {
                return res.status(400).json({ message: 'Security key is required for this role' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user into the database
            db.query(
                'INSERT INTO users (username, email, password, role, security_key) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, userRole, security_key || ''],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ message: `Database error: ${err.message}` });
                    }
                    return res.status(201).json({ message: `Registration successful! You are registered as ${userRole}.` });
                }
            );
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Server error: ${err.message}` });
    }
});

// 🔹 Login Route (Guests login normally, Owners/Clerks need security key)
router.post('/login', (req, res) => {
    const { email, password, security_key } = req.body; // Ensure security_key is correctly destructured

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
        if (err) {
            return res.status(500).json({ message: `Database error: ${err.message}` });
        }

        if (result.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const user = result[0];

        // 🔹 Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // 🔹 Owners & Clerks must provide a security key
        if (user.role === 'owner' || user.role === 'clerk') {
            if (!security_key) {
                return res.status(400).json({ message: 'Security key is required for this role' });
            }

            if (security_key !== user.security_key) {
                return res.status(400).json({ message: 'Invalid security key' });
            }
        }

        // 🔹 Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.json({
            message: 'Login successful',
            token,
            username: user.username,
            email: user.email,
            role: user.role,
            id: user.id
        });
    });
});

module.exports = router;
