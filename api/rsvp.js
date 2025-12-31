import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, surname, number, email, company, timestamp } = req.body;

  // Validate required fields
  if (!name || !surname || !email || !number || !company) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // 1. Send data to Google Sheets via webhook
    const sheetsResponse = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name, 
        surname, 
        number, 
        email, 
        company, 
        timestamp 
      })
    });

    if (!sheetsResponse.ok) {
      console.error('Failed to save to Google Sheets');
    }

    // 2. Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 3. Send confirmation email to attendee
    await transporter.sendMail({
      from: `"Apex Advisory Solutions" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'RSVP Confirmation - Apex Advisory Launch & Networking Event',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #334155;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: white;
              padding: 40px 30px;
              border: 1px solid #e2e8f0;
              border-top: none;
            }
            .highlight {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .details {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .details p {
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #64748b;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              background: #f59e0b;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ RSVP Confirmed</h1>
            </div>
            <div class="content">
              <h2>Thank You, ${name}!</h2>
              <p>We're delighted to confirm your registration for the <strong>Apex Advisory Solutions Launch & Networking Event</strong>.</p>
              
              <div class="highlight">
                <strong>📅 Event Date:</strong> March 6, 2026 (Thursday)<br>
                <strong>⏰ Time:</strong> 08:00 AM - 05:00 PM<br>
                <strong>📍 Venue:</strong> To be announced (Durban, KwaZulu-Natal)
              </div>

              <div class="details">
                <h3 style="margin-top: 0; color: #0f172a;">Your Registration Details:</h3>
                <p><strong>Name:</strong> ${name} ${surname}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${number}</p>
                <p><strong>Company:</strong> ${company}</p>
              </div>

              <h3 style="color: #0f172a;">About This Event</h3>
              <p>Join us for an exclusive business networking evening celebrating the official launch of Apex Advisory Solutions. This is your opportunity to:</p>
              <ul>
                <li>Connect with business leaders and entrepreneurs</li>
                <li>Meet our founders, Avathar Soni Naidoo and Ashendran Naidoo</li>
                <li>Discover how Apex can support your business transformation</li>
                <li>Explore strategic partnership opportunities</li>
                <li>Enjoy quality refreshments and professional networking</li>
              </ul>

              <h3 style="color: #0f172a;">What's Next?</h3>
              <ul>
                <li>Keep this email for your records</li>
                <li>We'll send you the exact venue details closer to the date</li>
                <li>Expect an event agenda and parking information soon</li>
                <li>Add the event to your calendar</li>
                <li>Feel free to bring business cards for networking</li>
              </ul>

              <p style="margin-top: 30px;">If you have any questions or need to update your registration, please contact us:</p>
              <p>
                📧 <a href="mailto:info.apexadvisorysolutions@gmail.com">info.apexadvisorysolutions@gmail.com</a><br>
                📞 Avathar: +27-82-315-4737<br>
                📞 Ashendran: +27-65-895-4832
              </p>

              <p style="margin-top: 30px;">We look forward to seeing you at the event!</p>
              
              <p style="margin-top: 30px;"><strong>Best regards,</strong><br>
              The Apex Advisory Solutions Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Apex Advisory Solutions (Pty) Ltd. All rights reserved.</p>
              <p>Leading business transformation and restructuring consultancy in South Africa</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    // 4. Send notification email to admin
    await transporter.sendMail({
      from: `"RSVP System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `New RSVP: ${name} ${surname} - Apex Advisory Launch Event`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
            .info-row { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .label { font-weight: bold; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🎉 New Event RSVP - Apex Advisory Launch</h2>
            </div>
            <div class="content">
              <p>A new attendee has registered for the Apex Advisory Solutions Launch & Networking Event:</p>
              
              <div class="info-row">
                <span class="label">Name:</span> ${name} ${surname}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> ${email}
              </div>
              <div class="info-row">
                <span class="label">Phone:</span> ${number}
              </div>
              <div class="info-row">
                <span class="label">Company:</span> ${company}
              </div>
              <div class="info-row">
                <span class="label">Registration Time:</span> ${new Date(timestamp).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
              </div>
              
              <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
                This information has been automatically saved to your Google Sheets.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    // Return success response
    res.status(200).json({ 
      success: true,
      message: 'RSVP confirmed successfully'
    });

  } catch (error) {
    console.error('Error processing RSVP:', error);
    res.status(500).json({ 
      error: 'Failed to process RSVP',
      details: error.message 
    });
  }
}