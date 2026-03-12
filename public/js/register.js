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
  const MIN_REGISTER_AGE = 16;

  function parseApiError(payload, fallbackText) {
    if (!payload) return fallbackText;
    if (typeof payload.detail === "string" && payload.detail.trim())
      return payload.detail;
    if (Array.isArray(payload.detail) && payload.detail.length) {
      const first = payload.detail[0];
      if (typeof first?.msg === "string" && first.msg.trim()) return first.msg;
    }
    if (typeof payload.message === "string" && payload.message.trim())
      return payload.message;
    return fallbackText;
  }

  function setMessage(text, type) {
    message.textContent = text;
    message.classList.remove("ok", "error");
    if (type) {
      message.classList.add(type);
    }
  }

  function validateInputs(
    username,
    email,
    birthDate,
    password,
    confirmPassword,
    acceptedPrivacy,
  ) {
    if (!USERNAME_REGEX.test(username)) {
      return "El username debe tener 3-16 caracteres y solo letras, números o _.";
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return "Introduce un email válido.";
    }

    if (!birthDate) {
      return "Introduce tu fecha de nacimiento.";
    }

    const parsed = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return "La fecha de nacimiento no es válida.";
    }

    const now = new Date();
    let age = now.getFullYear() - parsed.getFullYear();
    const monthDiff = now.getMonth() - parsed.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && now.getDate() < parsed.getDate())
    ) {
      age -= 1;
    }
    if (age < MIN_REGISTER_AGE) {
      return `Debes tener al menos ${MIN_REGISTER_AGE} años para registrarte.`;
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

    if (!acceptedPrivacy) {
      return "Debes aceptar la Política de Privacidad para registrarte.";
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
    const birthDate = String(formData.get("birthDate") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const source = String(formData.get("source") || "web");
    const acceptedPrivacy =
      String(formData.get("acceptedPrivacy") || "") === "on";

    const validationError = validateInputs(
      username,
      email,
      birthDate,
      password,
      confirmPassword,
      acceptedPrivacy,
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
          birth_date: birthDate,
          password,
          confirm_password: confirmPassword,
          source,
          accepted_privacy: acceptedPrivacy,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorText = parseApiError(
          data,
          "No se pudo completar el registro.",
        );
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
