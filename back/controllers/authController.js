import User from "../models/User.js";
import OTP from "../models/OTP.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import sendEmail from "../utils/sendEmail.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({ email, otp });

    await User.create({
      name,
      email,
      password,
      isVerified: false
    });

    await sendEmail(email, otp);

    res.status(200).json({ message: "OTP sent to email" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const record = await OTP.findOne({ email, otp });
  if (!record) return res.status(400).json({ message: "Invalid OTP" });

  await User.updateOne({ email }, { isVerified: true });

  res.json({ message: "Email verified successfully" });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  if (!user.isVerified)
    return res.status(403).json({ message: "Verify email first" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token, role: user.role });
};