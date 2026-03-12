(() => {
  const form = document.getElementById("register-form");
  const message = document.getElementById("form-message");
  const submitButton = document.getElementById("submit-btn");

  if (!form || !message || !submitButton) {
    return;
  }

  const API_BASE_URL = window.ENDCOSMOS_API_URL || "http://127.0.0.1:8000";
  const USERNAME_REGEX = /^[A-Za-z0-9_]{3,16}$/;
  const BLOCKED_CHARS_REGEX = /[<>"'`;]|--/;

  function setMessage(text, type) {
    message.textContent = text;
    message.classList.remove("ok", "error");
    if (type) {
      message.classList.add(type);
    }
  }

  function validateInputs(username, email, password, confirmPassword) {
    if (!USERNAME_REGEX.test(username)) {
      return "El username debe tener 3-16 caracteres y solo letras, números o _.";
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return "Introduce un email válido.";
    }

    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    if (BLOCKED_CHARS_REGEX.test(password)) {
      return "La contraseña contiene caracteres o secuencias bloqueadas.";
    }

    if (password !== confirmPassword) {
      return "La confirmación de contraseña no coincide.";
    }

    return "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const username = String(formData.get("username") || "").trim();
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const source = String(formData.get("source") || "web");

    const validationError = validateInputs(
      username,
      email,
      password,
      confirmPassword,
    );
    if (validationError) {
      setMessage(validationError, "error");
      return;
    }

    submitButton.disabled = true;
    setMessage("Registrando cuenta...", null);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
          confirm_password: confirmPassword,
          source,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorText =
          data?.detail || data?.message || "No se pudo completar el registro.";
        setMessage(errorText, "error");
        return;
      }

      setMessage("Registro exitoso. Ya puedes iniciar sesión.", "ok");
      form.reset();
    } catch (error) {
      setMessage(
        "Error de red. Verifica que la API esté activa en /register.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
    }
  });
})();
