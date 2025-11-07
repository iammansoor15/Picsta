import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import ProfilePhotoUploadHelper from '../utils/ProfilePhotoUploadHelper';

/**
 * Profile Photo Upload Component
 * 
 * Usage:
 * <ProfilePhotoUpload 
 *   onPhotoUploaded={(url) => console.log('Photo uploaded:', url)}
 *   onPhotoDeleted={() => console.log('Photo deleted')}
 * />
 */
const ProfilePhotoUpload = ({ onPhotoUploaded, onPhotoDeleted, initialPhotoUrl }) => {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(initialPhotoUrl || null);
  const [loading, setLoading] = useState(false);

  // Fetch existing profile photo on mount
  useEffect(() => {
    if (!initialPhotoUrl) {
      fetchProfilePhoto();
    }
  }, [initialPhotoUrl]);

  const fetchProfilePhoto = async () => {
    try {
      const url = await ProfilePhotoUploadHelper.getProfilePhoto();
      if (url) {
        setProfilePhotoUrl(url);
      }
    } catch (error) {
      console.error('Error fetching profile photo:', error);
    }
  };

  const handleUploadPhoto = async () => {
    setLoading(true);
    
    const url = await ProfilePhotoUploadHelper.pickAndUploadProfilePhoto(
      (uploadedUrl) => {
        setProfilePhotoUrl(uploadedUrl);
        setLoading(false);
        if (onPhotoUploaded) {
          onPhotoUploaded(uploadedUrl);
        }
      },
      (error) => {
        console.error('Upload error:', error);
        setLoading(false);
      }
    );
  };

  const handleDeletePhoto = () => {
    ProfilePhotoUploadHelper.showDeleteConfirmation(async () => {
      setLoading(true);
      
      const success = await ProfilePhotoUploadHelper.deleteProfilePhoto(
        () => {
          setProfilePhotoUrl(null);
          setLoading(false);
          if (onPhotoDeleted) {
            onPhotoDeleted();
          }
        },
        (error) => {
          console.error('Delete error:', error);
          setLoading(false);
        }
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.photoContainer}>
        {profilePhotoUrl ? (
          <Image
            source={{ uri: profilePhotoUrl }}
            style={styles.profilePhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.uploadButton]}
          onPress={handleUploadPhoto}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
          </Text>
        </TouchableOpacity>

        {profilePhotoUrl && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeletePhoto}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Delete Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfilePhotoUpload;
