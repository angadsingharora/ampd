import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="person-outline" size={64} color="#ccc" />
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: '600', color: '#333', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
});
