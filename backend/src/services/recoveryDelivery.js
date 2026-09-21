function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isExplicitlyEnabled(value) {
  return value === true || normalize(value).toLowerCase() === "true";
}

function createProductionRecoveryDelivery({
  enabled = false,
  apiKey = "",
  fromEmail = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedApiKey = normalize(apiKey);
  const normalizedFromEmail = normalize(fromEmail);

  function isEnabled() {
    return (
      isExplicitlyEnabled(enabled) &&
      normalizedApiKey.length > 0 &&
      normalizedFromEmail.length > 0 &&
      typeof fetchImpl === "function"
    );
  }

  async function deliverPasswordReset({
    email,
    resetUrl,
    expiresAt,
  }) {
    if (!isEnabled()) {
      return { delivered: false };
    }

    const recipient = normalize(email);
    const url = normalize(resetUrl);

    if (!recipient || !url || !(expiresAt instanceof Date)) {
      throw new Error("Recovery delivery failed");
    }

    const response = await fetchImpl(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${normalizedApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: normalizedFromEmail,
          to: [recipient],
          subject: "Reset your RUNFORME password",
          text: [
            "A password reset was requested for your RUNFORME account.",
            "",
            `Reset your password: ${url}`,
            "",
            `This link expires at ${expiresAt.toISOString()}.`,
            "",
            "If you did not request this reset, you can ignore this email.",
          ].join("\n"),
        }),
      }
    );

    if (!response || response.ok !== true) {
      throw new Error("Recovery delivery failed");
    }

    return { delivered: true };
  }

  return {
    isEnabled,
    deliverPasswordReset,
  };
}

const recoveryDelivery = createProductionRecoveryDelivery({
  enabled: process.env.RUNFORME_RECOVERY_DELIVERY_ENABLED,
  apiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RECOVERY_FROM_EMAIL,
  fetchImpl: globalThis.fetch,
});

function createInMemoryRecoveryDelivery() {
  const deliveries = [];

  return {
    isEnabled() {
      return true;
    },

    async deliverPasswordReset(message) {
      deliveries.push(message);
      return { delivered: true };
    },

    getDeliveries() {
      return [...deliveries];
    },
  };
}

module.exports = {
  recoveryDelivery,
  createProductionRecoveryDelivery,
  createInMemoryRecoveryDelivery,
};
