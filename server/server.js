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

    // Send emails with professional HTML templates & plain text fallback
    const mailOptionsClient = {
      from: `"Loan Hub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Loan Application Access Link - ${name}`,
      text: `Hello ${name},\n\nYour access has been granted for: ${lendingPage}\n\nYou can access your application form using this link:\n${accessUrl}\n\nExpires on: ${expires} (${expiryDuration})\n\nThank you,\nLoan Hub Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
            .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
            .body { padding: 32px 28px; }
            .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 14px; }
            .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
            .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .info-label { color: #64748b; font-weight: 500; }
            .info-value { color: #0f172a; font-weight: 600; }
            .btn-wrapper { text-align: center; margin: 28px 0; }
            .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 10px rgba(37,99,235,0.25); }
            .url-box { background: #eff6ff; border: 1px dashed #93c5fd; border-radius: 10px; padding: 14px; font-size: 13px; color: #1d4ed8; word-break: break-all; margin-top: 20px; line-height: 1.5; }
            .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Loan Hub Portal Access</h1>
              <p>Your secure loan application link is ready</p>
            </div>
            <div class="body">
              <div class="greeting">Hello ${name},</div>
              <p class="text">You have been granted access to complete your loan application online. Please use the secure link below to open your form:</p>
              
              <div class="info-card">
                <div class="info-row"><span class="info-label">Application Form:</span> <span class="info-value">${lendingPage}</span></div>
                <div class="info-row"><span class="info-label">Access Duration:</span> <span class="info-value">${expiryDuration}</span></div>
                <div class="info-row" style="margin-bottom:0;"><span class="info-label">Expires On:</span> <span class="info-value" style="color: #dc2626;">${expires}</span></div>
              </div>

              <div class="btn-wrapper">
                <a href="${accessUrl}" class="cta-btn" target="_blank">Access Loan Application Form</a>
              </div>

              <div class="url-box">
                <strong>Or copy and paste this link in your browser:</strong><br>
                <a href="${accessUrl}" style="color: #2563eb; text-decoration: underline;">${accessUrl}</a>
              </div>
            </div>
            <div class="footer">
              This is an automated notification. If you did not request this loan application, please ignore this email.<br>
              &copy; ${new Date().getFullYear()} Loan Hub. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `
    };

    const mailOptionsCompany = {
      from: `"Loan Hub Notification" <${process.env.EMAIL_USER}>`,
      to: process.env.COMPANY_EMAIL,
      subject: `New Client Added: ${name} (${lendingPage})`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #1e293b; margin-top: 0;">New Client Added Successfully</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
            <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Client Name:</td><td style="color: #0f172a;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Client Email:</td><td style="color: #0f172a;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Selected Page:</td><td style="color: #0f172a;">${lendingPage}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Token Expiry:</td><td style="color: #dc2626;">${expires} (${expiryDuration})</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Access URL:</td><td><a href="${accessUrl}">${accessUrl}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Added At:</td><td style="color: #64748b;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
      `
    };

    let emailSent = false;
    try {
      const [clientRes, companyRes] = await Promise.all([
        transporter.sendMail(mailOptionsClient),
        transporter.sendMail(mailOptionsCompany)
      ]);
      console.log(`[EMAIL SUCCESS] Sent to client (${email}) - MessageId: ${clientRes.messageId}`);
      console.log(`[EMAIL SUCCESS] Sent to company (${process.env.COMPANY_EMAIL}) - MessageId: ${companyRes.messageId}`);
      emailSent = true;
    } catch (emailErr) {
      console.error('[EMAIL ERROR] Failed to send email (non-fatal):', emailErr.message);
    }

    res.status(201).json({
      ...newClient.toObject(),
      emailSent
    });
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
