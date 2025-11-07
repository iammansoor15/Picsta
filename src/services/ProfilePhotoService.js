import backgroundRemovalService from './BackgroundRemovalService';
import AppConfig from '../config/AppConfig';

// Resolve the base URL for profile photo requests
const base = () => {
  const unified = backgroundRemovalService.getServerConfig()?.baseUrl;
  if (unified) return String(unified).replace(/\/$/, '');

  const devAuth = AppConfig?.DEVELOPMENT?.DEV_AUTH_SERVER_URL;
  if (devAuth) return String(devAuth).replace(/\/$/, '');

  const prodAuth = AppConfig?.PRODUCTION_AUTH_SERVER_URL || AppConfig?.PRODUCTION_SERVER_URL;
  if (prodAuth) return String(prodAuth).replace(/\/$/, '');

  return 'http://localhost:10000';
};

/**
 * Upload profile photo to server and Cloudinary
 * @param {string} imageUri - Local image URI (file:// or content://)
 * @param {string} token - JWT authentication token
 * @returns {Promise<Object>} - Response with profilePhotoUrl
 */
const uploadProfilePhoto = async (imageUri, token) => {
  try {
    console.log('📸 ProfilePhotoService: Starting upload...');
    
    if (!imageUri) {
      throw new Error('Image URI is required');
    }

    if (!token) {
      throw new Error('Authentication token is required');
    }

    // Create FormData
    const formData = new FormData();
    
    // Parse the image URI
    let filename = 'profile_photo.jpg';
    let type = 'image/jpeg';

    if (imageUri.includes('.png')) {
      filename = 'profile_photo.png';
      type = 'image/png';
    } else if (imageUri.includes('.jpg') || imageUri.includes('.jpeg')) {
      filename = 'profile_photo.jpg';
      type = 'image/jpeg';
    }

    // Append the file to FormData
    formData.append('profilePhoto', {
      uri: imageUri,
      type: type,
      name: filename,
    });

    const serverBase = base();
    const url = `${serverBase}/api/profile-photo/upload`;

    console.log('📤 Uploading to:', url);

    // Upload with timeout (increased for background removal processing)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout (2 minutes)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Note: Don't set Content-Type for FormData - it will be set automatically with boundary
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log('📥 Response status:', response.status);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data?.error || `Upload failed: ${response.status}`);
      }

      console.log('✅ Profile photo uploaded successfully');
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('Upload timeout - server not responding');
      }
      throw err;
    }
  } catch (error) {
    console.error('❌ ProfilePhotoService upload error:', error);
    throw error;
  }
};

/**
 * Get current user's profile photo URL
 * @param {string} token - JWT authentication token
 * @returns {Promise<string|null>} - Profile photo URL or null
 */
const getProfilePhoto = async (token) => {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const serverBase = base();
    const url = `${serverBase}/api/profile-photo`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `Failed to get profile photo: ${response.status}`);
    }

    return data?.data?.profilePhotoUrl || null;
  } catch (error) {
    console.error('❌ ProfilePhotoService get error:', error);
    throw error;
  }
};

/**
 * Delete current user's profile photo
 * @param {string} token - JWT authentication token
 * @returns {Promise<Object>} - Success response
 */
const deleteProfilePhoto = async (token) => {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const serverBase = base();
    const url = `${serverBase}/api/profile-photo`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `Failed to delete profile photo: ${response.status}`);
    }

    console.log('✅ Profile photo deleted successfully');
    return data;
  } catch (error) {
    console.error('❌ ProfilePhotoService delete error:', error);
    throw error;
  }
};

export default {
  uploadProfilePhoto,
  getProfilePhoto,
  deleteProfilePhoto,
};
