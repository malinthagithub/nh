const express = require('express');
const router = express.Router();
const db = require('../db'); // Import database connection

// ✅ POST: Add a new review
router.post('/add', (req, res) => {
  const { id, room_id, rating, comment } = req.body;

  if (!id || !room_id || !rating) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = 'INSERT INTO reviews (id, room_id, rating, comment) VALUES (?, ?, ?, ?)';
  db.query(sql, [id, room_id, rating, comment], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Review added successfully' });
  });
});

// ✅ GET: Fetch all reviews for a specific room
router.get('/:room_id', (req, res) => {
  const room_id = req.params.room_id;

  const sql = `
    SELECT r.review_id, r.rating, r.comment, r.created_at, u.username 
    FROM reviews r
    JOIN users u ON r.id = u.id
    WHERE r.room_id = ? ORDER BY r.created_at DESC
  `;

  db.query(sql, [room_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});

module.exports = router;
