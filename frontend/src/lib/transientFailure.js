export function classifyTransientFailure(error) {
  const status = error?.response?.status;

  if (Number.isInteger(status) && status >= 500 && status <= 599) {
    return {
      kind: "server",
      message: "Something went wrong. Try again.",
      retryable: true
    };
  }

  if (Number.isInteger(status)) {
    return {
      kind: "api",
      message: "Something went wrong.",
      retryable: false
    };
  }

  return {
    kind: "network",
    message: "Something went wrong. Try again.",
    retryable: true
  };
}