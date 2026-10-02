import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase'; // Adjust this path if necessary

export default function IncidentReporter() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [billingState, setBillingState] = useState('ACTIVE');

  // Hardcoded for PoC (In a real app, this comes from the authenticated session)
  const mockDriverId = 'PASTE_A_DRIVER_UUID_HERE'; 
  const mockVehicleId = 'PASTE_A_VEHICLE_UUID_HERE';

  // Listen to Supabase Realtime for instant Billing State Changes
  useEffect(() => {
    const channel = supabase
      .channel('public:vehicles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vehicles', filter: `id=eq.${mockVehicleId}` },
        (payload) => {
          setBillingState(payload.new.billing_status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true, // Required for Supabase Storage payload
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const submitIncident = async () => {
    if (!image || !image.base64) {
      Alert.alert('Missing Image', 'Please capture the dashboard warning or vehicle damage first.');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload the image to the 'incident-media' bucket
      const fileName = `${Date.now()}-fault.jpg`;
      const filePath = `public/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('incident-media')
        .upload(filePath, decode(image.base64), {
          contentType: 'image/jpeg',
        });

      if (storageError) throw storageError;

      // 2. Retrieve the public URL for the database
      const { data: publicUrlData } = supabase.storage
        .from('incident-media')
        .getPublicUrl(filePath);

      // 3. Insert the Ticket into the Postgres Database
      const { error: dbError } = await supabase
        .from('maintenance_tickets')
        .insert({
          driver_id: mockDriverId,
          vehicle_id: mockVehicleId,
          fault_description: 'Driver reported issue via mobile app.',
          image_url: publicUrlData.publicUrl,
        });

      if (dbError) throw dbError;

      Alert.alert('Success', 'Incident logged. Please proceed to the nearest Moove depot.');
      setImage(null);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Real-time Status Card */}
      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Daily Remittance Status</Text>
        <View style={[styles.statusBadge, billingState === 'PAUSED' ? styles.badgePaused : styles.badgeActive]}>
          <Text style={styles.badgeText}>{billingState}</Text>
        </View>
        <Text style={styles.cardSubtitle}>₦18,700 / day</Text>
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.headerText}>Report Vehicle Fault</Text>
        
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No damage captured</Text>
          </View>
        )}

        <TouchableOpacity style={styles.captureButton} onPress={pickImage} disabled={uploading}>
          <Text style={styles.buttonText}>Capture Dashboard/Damage</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, (!image || uploading) && styles.submitButtonDisabled]} 
          onPress={submitIncident} 
          disabled={!image || uploading}
        >
          {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Submit Ticket</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 24,
    paddingTop: 80,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#9DC183', // Sage green shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    color: '#6B4C9A', // Deep purple
    fontWeight: '600',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 12,
  },
  badgeActive: {
    backgroundColor: '#9DC183', // Sage green
  },
  badgePaused: {
    backgroundColor: '#CC5500', // Burnt orange
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: 1.5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  actionSection: {
    flex: 1,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    marginBottom: 24,
  },
  imagePlaceholder: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 76, 154, 0.05)',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(107, 76, 154, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderText: {
    color: '#6B4C9A',
    fontSize: 16,
    opacity: 0.6,
  },
  captureButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#6B4C9A',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#6B4C9A',
    fontWeight: '700',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#CC5500', // Burnt orange
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E0A988',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});