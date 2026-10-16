const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
let lastDbError = null;
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  lastDbError = 'process.env.MONGODB_URI is MISSING on this server. Add it in Render Environment Variables.';
  console.error(lastDbError);
} else {
  mongoose.connect(mongoURI)
    .then(() => {
      console.log('MongoDB connected successfully');
      lastDbError = null;
    })
    .catch(err => {
      lastDbError = err.message;
      console.error('MongoDB connection error:', err.message);
    });
}

// Client Schema
const clientSchema = new mongoose.Schema({
  name: String,
  email: String,
  lendingPage: String,
  expiryDuration: String,
  expires: String,
  accessUrl: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbStatus,
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    lastError: lastDbError
  });
});

// Middleware to check and auto-reconnect DB if needed
const checkDbConnection = async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  if (!mongoURI) {
    return res.status(503).json({
      error: 'process.env.MONGODB_URI is missing. Add it in Render Environment Variables.'
    });
  }

  try {
    await mongoose.connect(mongoURI);
    lastDbError = null;
    console.log('MongoDB auto-reconnected successfully');
    next();
  } catch (err) {
    lastDbError = err.message;
    console.error('MongoDB retry failed:', err.message);
    return res.status(503).json({
      error: `Database connection error: ${err.message}`
    });
  }
};

// Get all clients
app.get('/api/clients', checkDbConnection, async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new client
app.post('/api/clients', checkDbConnection, async (req, res) => {
  try {
    const { name, email, lendingPage, expiryDuration, expires, accessUrl } = req.body;

    const newClient = new Client({
      name,
      email,
      lendingPage,
      expiryDuration,
      expires,
      accessUrl
    });

    await newClient.save();

    // Send emails separately — email failure should NOT block the response
    const mailOptionsClient = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Loan Application Access',
      html: `
        <h3>Hello ${name},</h3>
        <p>Your access has been granted. You can access your application form using the link below:</p>
        <p><a href="${accessUrl}">${accessUrl}</a></p>
        <p>This link expires on: ${expires}</p>
      `
    };

    const mailOptionsCompany = {
      from: process.env.EMAIL_USER,
      to: process.env.COMPANY_EMAIL,
      subject: 'New Client Added - Notification',
      html: `
        <h3>New Client Details</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Lending Page:</strong> ${lendingPage}</p>
        <p><strong>Access URL:</strong> ${accessUrl}</p>
      `
    };

    // Fire-and-forget: email errors won't cause 500
    Promise.all([
      transporter.sendMail(mailOptionsClient),
      transporter.sendMail(mailOptionsCompany)
    ]).catch(emailErr => {
      console.error('Email sending failed (non-fatal):', emailErr.message);
    });

    res.status(201).json(newClient);
  } catch (err) {
    console.error('POST /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update client status
app.patch('/api/clients/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
