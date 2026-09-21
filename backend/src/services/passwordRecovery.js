const crypto = require("node:crypto");

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const INVALID_RESET_RESULT = Object.freeze({
  reset: false,
  reason: "invalid_or_expired",
});

function hashToken(rawToken) {
  return crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
}

function createPasswordRecoveryService({
  prisma,
  delivery,
  now = () => new Date(),
  randomBytes = crypto.randomBytes,
}) {
  if (!prisma) {
    throw new Error("Password recovery persistence is required.");
  }

  if (!delivery || typeof delivery.isEnabled !== "function") {
    throw new Error("Password recovery delivery adapter is required.");
  }

  async function issuePasswordReset({ userId, email, resetUrlBase }) {
    if (!delivery.isEnabled()) {
      return { issued: false };
    }

    const issuedAt = now();
    const expiresAt = new Date(issuedAt.getTime() + RESET_TOKEN_TTL_MS);
    const rawToken = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
    const tokenHash = hashToken(rawToken);

    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        consumedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: issuedAt,
      },
    });

    const issuedToken = await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = new URL(resetUrlBase);
    resetUrl.searchParams.set("token", rawToken);

    try {
      await delivery.deliverPasswordReset({
        email,
        resetUrl: resetUrl.toString(),
        expiresAt,
      });
    } catch (error) {
      await prisma.passwordResetToken.updateMany({
        where: {
          id: issuedToken.id,
          consumedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: issuedAt,
        },
      });

      throw error;
    }

    return { issued: true };
  }

  async function resetPassword({ token, passwordHash }) {
    const tokenHash = hashToken(token);
    const currentTime = now();

    return prisma.$transaction(async (tx) => {
      const tokenRecord = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (
        !tokenRecord ||
        tokenRecord.consumedAt !== null ||
        tokenRecord.revokedAt !== null ||
        tokenRecord.expiresAt.getTime() <= currentTime.getTime()
      ) {
        return { ...INVALID_RESET_RESULT };
      }

      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: tokenRecord.id,
          consumedAt: null,
          revokedAt: null,
        },
        data: {
          consumedAt: currentTime,
        },
      });

      if (consumed.count !== 1) {
        return { ...INVALID_RESET_RESULT };
      }

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          password: passwordHash,
          sessionVersion: { increment: 1 },
        },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: tokenRecord.userId,
          id: { not: tokenRecord.id },
          consumedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: currentTime,
        },
      });

      return { reset: true };
    });
  }

  return {
    issuePasswordReset,
    resetPassword,
  };
}

module.exports = {
  createPasswordRecoveryService,
};
