const express = require('express');
const router = express.Router();
const db = require('../db'); // Import your database connection

// Bookings for today and this week route
router.get('/today-and-week-bookings', async (req, res) => {
    const today = new Date(); // Get today's date
    const localDate = today.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format (local timezone)

    // Query to get today's bookings (now comparing only the date part)
    const todayQuery = `
        SELECT
            r.name AS room_name,
            u.username,
            b.checkin_date,
            b.checkout_date,
            b.total_amount AS payment_amount
        FROM bookings b
        JOIN rooms r ON b.room_id = r.room_id
        JOIN users u ON b.user_id = u.id
        WHERE b.status = 'confirmed' 
        AND DATE(b.checkin_date) = ?  -- Ensure checkin_date is compared in 'YYYY-MM-DD' format
    `;

    // Query to get this week's bookings
    const weekQuery = `
        SELECT
            r.name AS room_name,
            u.username,
            b.checkin_date,
            b.checkout_date,
            b.total_amount AS payment_amount
        FROM bookings b
        JOIN rooms r ON b.room_id = r.room_id
        JOIN users u ON b.user_id = u.id
        WHERE b.status = 'confirmed' 
        AND YEARWEEK(b.checkin_date, 1) = YEARWEEK(CURDATE(), 1) -- Filter for this week
    `;

    try {
        // Execute both queries in parallel
        const [allBookings, weekBookings] = await Promise.all([
            new Promise((resolve, reject) => {
                db.query(todayQuery, [localDate], (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(weekQuery, (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                });
            })
        ]);

        // Send both sets of data as separate responses
        res.json({
            todayBookings: allBookings,
            weekBookings: weekBookings,
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
