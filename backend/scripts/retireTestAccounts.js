const prisma = require("../src/config/db");

const APPLY = process.argv.includes("--apply");
const AUTHORIZED =
  process.env.RUNFORME_ACCOUNT_RETIREMENT_AUTHORIZED === "true";

function isReservedTestEmail(email) {
  return typeof email === "string" &&
    email.trim().toLowerCase().endsWith(".test");
}

async function main() {
  if (APPLY && !AUTHORIZED) {
    throw new Error(
      "Refusing to apply account retirement without RUNFORME_ACCOUNT_RETIREMENT_AUTHORIZED=true"
    );
  }

  const candidates = await prisma.user.findMany({
    where: {
      email: {
        endsWith: ".test",
        mode: "insensitive",
      },
      accountStatus: "active",
    },
    select: {
      id: true,
      email: true,
      role: true,
      stripeConnectedAccountId: true,
      _count: {
        select: {
          runnerPayouts: true,
          runnerBankPayouts: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const unsafe = candidates.filter(
    (user) =>
      !isReservedTestEmail(user.email) ||
      Boolean(user.stripeConnectedAccountId) ||
      user._count.runnerPayouts > 0 ||
      user._count.runnerBankPayouts > 0
  );

  if (unsafe.length > 0) {
    throw new Error(
      "Refusing account retirement because a candidate has payout/Connect history or is outside the reserved .test namespace"
    );
  }

  console.log(`MODE=${APPLY ? "APPLY" : "DRY_RUN"}`);
  console.log(`CANDIDATES=${candidates.length}`);

  for (const user of candidates) {
    console.log(
      `CANDIDATE id=${user.id} role=${user.role} email=${user.email}`
    );
  }

  if (!APPLY) {
    console.log("ACCOUNT_RETIREMENT_APPLIED=NO");
    return;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const user of candidates) {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          accountStatus: "retired",
          sessionVersion: { increment: 1 },
        },
      });
    }
  });

  console.log(`RETIRED=${candidates.length}`);
  console.log("ACCOUNT_RETIREMENT_APPLIED=YES");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
