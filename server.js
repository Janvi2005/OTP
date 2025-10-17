import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 CONFIG
const FAST2SMS_API_KEY = "YOUR_FAST2SMS_API_KEY";
const AIRTABLE_API_KEY = "patTvsSaCejicyClL.1994f99fc95c6e0cf98be23451d22f4eccc244bcc6b26847a44f9c51af2f5f2d";
const AIRTABLE_BASE_ID = "appugbx3nLr67t8EC";
const TABLE_NAME = "Users";

// Helper: Save OTP to Airtable
async function saveOTP(phone, otp) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: { Phone: phone, OTP: otp, Verified: false, CreatedAt: new Date().toISOString() },
    }),
  });
  return res.json();
}

// Helper: Verify OTP
async function checkOTP(phone, otp) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}?filterByFormula=AND({Phone}='${phone}',{OTP}='${otp}')`,
    { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
  );
  const data = await res.json();
  if (data.records.length > 0) {
    const id = data.records[0].id;
    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { Verified: true } }),
      }
    );
    return true;
  }
  return false;
}

// ✅ Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    // Send SMS via Fast2SMS
    await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        Authorization: FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "v3",
        sender_id: "TXTIND",
        message: `Your OTP is ${otp}`,
        language: "english",
        numbers: phone,
      }),
    });

    await saveOTP(phone, otp);
    res.json({ status: "ok", message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  const ok = await checkOTP(phone, otp);
  if (ok) res.json({ status: "verified" });
  else res.status(400).json({ status: "invalid" });
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));
