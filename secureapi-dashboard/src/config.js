// Configuration for local development
const DEV_MODE = true; // Set to false to use IP address for testing on other devices

// Get the local IP address
const getLocalIP = () => {
  // Replace this with your actual local IP address
  // You can find it by running:
  // - On macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
  // - On Windows: ipconfig | findstr IPv4
  return DEV_MODE ? 'localhost' : '10.1.57.226'; // Switch between localhost and IP
};

const LOCAL_IP = getLocalIP();
const API_URL = `http://${LOCAL_IP}:5001`;
const SOCKET_URL = `http://${LOCAL_IP}:5001`;

// Log the current configuration
console.log(`Using ${DEV_MODE ? 'localhost' : 'IP address'} for API connections`);
console.log(`API_URL: ${API_URL}`);

export { API_URL, SOCKET_URL }; 