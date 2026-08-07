const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_COMPLEXITY_MSG =
  'La nueva contraseña debe tener al menos 6 caracteres, una letra mayúscula, un número y un carácter especial (. * + -).';

function validarComplejidadContrasena(contrasena) {
  const pwd = String(contrasena);
  if (pwd.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: PASSWORD_COMPLEXITY_MSG };
  }
  const valid =
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[.*+\-]/.test(pwd);
  return valid ? { ok: true } : { ok: false, error: PASSWORD_COMPLEXITY_MSG };
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  PASSWORD_COMPLEXITY_MSG,
  validarComplejidadContrasena,
};
