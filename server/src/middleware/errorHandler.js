const AppError = require("../utils/AppError");

module.exports = (err, req, res, next) => {
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Invalid request",
      details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ error: "That name is already in use" });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Not found" });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};