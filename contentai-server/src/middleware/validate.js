export function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "A valid email address is required.";
  }

  if (!password || password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "Password must contain at least one uppercase letter.";
  } else if (!/[0-9]/.test(password)) {
    errors.password = "Password must contain at least one number.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ error: "Validation failed.", fields: errors });
  }

  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "A valid email address is required.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ error: "Validation failed.", fields: errors });
  }

  next();
}
