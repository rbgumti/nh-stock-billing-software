
// Function to generate unique patient ID with full customization
export const generatePatientId = (
  prefix: string = "NH",
  includeDate: boolean = true,
  includeTime: boolean = true,
  includeRandom: boolean = true,
  separator: string = "-",
  randomLength: number = 3
) => {
  let idParts: string[] = [];
  
  // Add prefix if provided
  if (prefix.trim()) {
    idParts.push(prefix.trim().toUpperCase());
  }
  
  // Add date component
  if (includeDate) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    idParts.push(`${year}${month}${day}`);
  }
  
  // Add time component
  if (includeTime) {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    idParts.push(`${hours}${minutes}`);
  }
  
  // Add random component
  if (includeRandom) {
    const maxNumber = Math.pow(10, randomLength) - 1;
    const randomNum = Math.floor(Math.random() * maxNumber).toString().padStart(randomLength, '0');
    idParts.push(randomNum);
  }
  
  // If no components selected, add timestamp as fallback
  if (idParts.length === 0) {
    idParts.push(Date.now().toString().slice(-6));
  }
  
  return idParts.join(separator);
};

// Simple version for backward compatibility
export const generateSimplePatientId = (prefix: string = "NH") => {
  const timestamp = Date.now().toString();
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp.slice(-6)}${randomNum}`;
};
