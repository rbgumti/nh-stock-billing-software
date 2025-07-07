
// Function to generate unique patient ID with custom prefix
export const generatePatientId = (prefix: string = "NH") => {
  const timestamp = Date.now().toString();
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp.slice(-6)}${randomNum}`;
};
