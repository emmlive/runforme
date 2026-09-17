const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_LENGTH_ERROR = "Password must be between 12 and 128 characters.";

function validatePassword(password) {
  if (
    typeof password !== "string" ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      valid: false,
      error: PASSWORD_LENGTH_ERROR,
    };
  }

  return { valid: true, error: null };
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  validatePassword,
};
