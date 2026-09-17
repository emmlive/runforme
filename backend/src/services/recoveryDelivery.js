const recoveryDelivery = {
  isEnabled() {
    return false;
  },

  async deliverPasswordReset() {
    return { delivered: false };
  },
};

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
  createInMemoryRecoveryDelivery,
};
