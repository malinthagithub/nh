const express = require("express");
const mysql = require("mysql2");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");  // Import cors

const router = express.Router();
const db = require("../db");  // Ensure correct path to your database file

// Enable CORS for all origins
router.use(cors());

router.post("/book-room", async (req, res) => {
  const {
    user_id,
    room_id,
    checkin_date,
    checkout_date,
    total_amount,
    payment_method_id,
  } = req.body;
  
  console.log("Received data:", req.body); // Log the received data

  try {
    if (!user_id || !room_id || !checkin_date || !checkout_date || !total_amount || !payment_method_id) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total_amount * 100,
      currency: "usd",
      payment_method_data: {
        type: 'card',
        card: {
          token: payment_method_id,
        },
      },
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment failed!" });
    }

    const insertBooking = `INSERT INTO bookings (user_id, room_id, checkin_date, checkout_date, total_amount, status, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, 'confirmed', NOW(), NOW())`;

    db.query(insertBooking, [user_id, room_id, checkin_date, checkout_date, total_amount], (err, result) => {
      if (err) {
        console.error("Error inserting booking:", err);
        return res.status(500).json({ message: "Booking failed due to database error." });
      }

      const booking_id = result.insertId;

      const insertPayment = `INSERT INTO payments (booking_id, amount, payment_status, payment_method, transaction_id, payment_date)
                             VALUES (?, ?, 'succeeded', 'card', ?, NOW())`;

      db.query(insertPayment, [booking_id, total_amount, paymentIntent.id], (err) => {
        if (err) {
          console.error("Error inserting payment:", err);
          return res.status(500).json({ message: "Payment record failed." });
        }

        res.json({ message: "Booking confirmed & payment successful!", booking_id });
      });
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({
      message: "Payment processing failed.",
      error: error.message || error,
    });
  }
});

module.exports = router;
