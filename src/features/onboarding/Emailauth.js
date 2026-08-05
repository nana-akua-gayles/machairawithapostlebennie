
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendMagicLink(email) {
  await delay(1400); // simulate network

  // Simulate occasional network error in dev so you can test the error state
  if (__DEV__ && email.toLowerCase().includes('fail')) {
    return { success: false, error: 'Unable to send email. Please try again.' };
  }

  return { success: true };
}

export async function resendMagicLink(email) {
  return sendMagicLink(email);
}