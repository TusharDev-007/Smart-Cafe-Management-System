const { z } = require("zod");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(100),
});

// Compared against when the email doesn't exist, so response time doesn't reveal valid emails
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

exports.login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) throw new AppError(401, "Invalid email or password");

    const token = jwt.sign({ role: user.role, name: user.name }, env.JWT_SECRET, {
      subject: String(user.id),
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: "HS256",
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};