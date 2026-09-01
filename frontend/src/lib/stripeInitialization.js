export function initializeStripe({ disableValue, publishableKey, loadStripe }) {
  if (disableValue === "true") {
    return null;
  }

  return loadStripe(publishableKey);
}
