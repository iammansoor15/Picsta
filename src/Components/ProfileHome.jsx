import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import TemplatePreferences from '../services/TemplatePreferences';
import PaymentService from '../services/PaymentService';

const TOKEN_KEY = 'AUTH_TOKEN';

export default function ProfileHome({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedReligions, setSelectedReligions] = useState(['hindu']);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const RELIGIONS = [
    { key: 'all', label: 'All' },
    { key: 'hindu', label: 'Hindu' },
    { key: 'muslim', label: 'Muslim' },
    { key: 'christian', label: 'Christian' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) {
          navigation.replace('ProfileEntry');
          return;
        }
        const data = await AuthService.me(token);
        setUser(data.user || data);
      } catch (e) {
        Alert.alert('Session', 'Please sign in to continue.');
        navigation.replace('ProfileEntry');
      } finally {
        setLoading(false);
      }
    };
    init();

    // Load saved main category (religion) preference(s)
    (async () => {
      try {
        const arr = await TemplatePreferences.getReligions();
        if (Array.isArray(arr) && arr.length) setSelectedReligions(arr);
      } catch {}
    })();
  }, [navigation]);

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      Alert.alert('Logged out', 'You have been signed out.');
      // Navigate back to the HeroScreen
      navigation.navigate('HeroScreen');
    } catch (e) {
      Alert.alert('Error', 'Failed to log out. Try again.');
    }
  };

  const onSave = async () => {
    try {
      await TemplatePreferences.setReligions(selectedReligions);
      Alert.alert('Saved', 'Your preferences have been updated.');
      // Navigate back so the previous screen regains focus and refreshes its data
      try { navigation.goBack(); } catch {}
    } catch (e) {
      Alert.alert('Error', 'Failed to save preferences.');
    }
  };

  const testPayment = async () => {
    try {
      setPaymentLoading(true);
      
      // Test payment of ₹1
      const result = await PaymentService.processPayment(
        1, // Amount in rupees
        {
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
        },
        {
          description: 'Test Payment',
          test: true,
        }
      );

      Alert.alert(
        'Payment Successful! 🎉',
        `Transaction ID: ${result.transactionId}\nAmount: ₹${result.amount / 100}\nStatus: ${result.status}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Test payment error:', error);
      const errorMsg = error.message || 'Payment failed';
      
      // User cancelled payment
      if (errorMsg.includes('cancel') || error.code === 2) {
        Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      } else {
        Alert.alert('Payment Failed', errorMsg);
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PICSTAR</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}> 
            <ActivityIndicator size="large" />
          </View>
        ) : user ? (
          <View>
            <Text style={styles.sectionTitle}>My Profile</Text>
            <View style={styles.card}>
              <Row label="Name" value={user.name} />
              {user.email ? <Row label="Email" value={user.email} /> : null}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Select Religion(s)</Text>
            <View style={styles.card}>
              {RELIGIONS.map(r => (
                <TouchableOpacity 
                  key={r.key} 
                  style={styles.checkboxRow} 
                  onPress={() => {
                    setSelectedReligions(prev => {
                      const set = new Set(prev.map(v => v.toLowerCase()));
                      if (r.key === 'all') {
                        // Toggle all
                        const isAll = ['hindu','muslim','christian'].every(k => set.has(k));
                        return isAll ? [] : ['hindu','muslim','christian'];
                      }
                      if (set.has(r.key)) {
                        set.delete(r.key);
                      } else {
                        set.add(r.key);
                      }
                      // If all three selected, reflect that in UI implicitly
                      return Array.from(set);
                    });
                  }}
                >
                  <Text style={styles.checkboxIcon}>
                    {r.key === 'all'
                      ? (['hindu','muslim','christian'].every(k => selectedReligions.includes(k)) ? '☑️' : '⬜')
                      : (selectedReligions.includes(r.key) ? '☑️' : '⬜')}
                  </Text>
                  <Text style={styles.checkboxLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={onSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={testPayment} 
              style={[styles.testPaymentBtn, paymentLoading && styles.btnDisabled]}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.testPaymentText}>Test Payment (₹1)</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.center}>
            <Text>No profile loaded.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  backBtn: { padding: 4, width: 32 },
  backText: { fontSize: 22 },
  title: { fontSize: 18, fontWeight: 'bold' },
  container: { padding: 16, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: '#555' },
  rowValue: { fontWeight: '600' },
  logoutBtn: { marginTop: 12, backgroundColor: '#ff3b30', padding: 14, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '600' },
  // New styles
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkboxIcon: { marginRight: 8, fontSize: 18 },
  checkboxLabel: { fontSize: 16, color: '#333' },
  saveBtn: { marginTop: 12, backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
  testPaymentBtn: { marginTop: 12, backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center' },
  testPaymentText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
