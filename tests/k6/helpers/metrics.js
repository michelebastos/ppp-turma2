import { Trend } from 'k6/metrics';

// Trend para monitorar duração das requests de POST /checkout
export const checkoutDuration = new Trend('checkout_duration');

// Função utilitária para registrar duração de uma response
export function recordCheckoutDuration(response) {
  if (response && response.timings && typeof response.timings.duration === 'number') {
    checkoutDuration.add(response.timings.duration);
  }
}
