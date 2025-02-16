import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push } from 'firebase/database';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';

const firebaseConfig = "REMOVED"

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function DonorScreen() {
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        location: '',
        email: '',
        date: new Date().toISOString().split('T')[0],
        postTitle: '',
        description: '',
        imageUri: '',
        servingSize: '1',
        customServingSize: false,
        customServingValue: '',
        postPassword: '',
        expiryDateTime: new Date(),
      });
  const [isLoading, setIsLoading] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData({ ...formData, imageUri: uri });
    }
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      });

      if (!result.canceled) {
        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData({ ...formData, imageUri: uri });
      }
    }
  };

  const handleExpiryChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
    
    if (selectedDate) {
      setFormData({ ...formData, expiryDateTime: selectedDate });
      
      if (Platform.OS === 'android' && showDatePicker) {
        setShowDatePicker(false);
        setShowTimePicker(true);
      }
    }
  };

  const handleSubmit = async () => {
    const mandatoryFields = ['name', 'location', 'email', 'date', 'postTitle', 'description', 'imageUri', 'contact', 'postPassword'];
    const missingFields = mandatoryFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      alert('Please fill in all mandatory fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const surplusFoodRef = ref(database, 'surplusFood');
      const now = new Date();
      const formattedTimestamp = now.toLocaleString();
      
      await push(surplusFoodRef, {
        ...formData,
        expiryDateTime: formData.expiryDateTime.toISOString(),
        status: 'Accepting',
        timestamp: formattedTimestamp,
      });  
      
      setFormData({
        name: '',
        contact: '',
        location: '',
        email: '',
        date: new Date().toISOString().split('T')[0],
        postTitle: '',
        description: '',
        imageUri: '',
        servingSize: '1',
        customServingSize: false,
        customServingValue: '',
        postPassword: '',
        expiryDateTime: new Date(),
      });
    } catch (error) {
      console.error("Error submitting data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerOverlay}>
          <MaterialCommunityIcons name="hand-heart" size={45} color="#FFFFFF" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Share Your Food</Text>
          <Text style={styles.headerSubtitle}>
            Help reduce food wastage by sharing your surplus food with those in need
          </Text>
        </View>
      </View>

      <View style={styles.formWrapper}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Donate Surplus Food</Text>
        
        <View style={styles.inputContainer}>
        <Text style={styles.legend}>Name:</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>
        

      <View style={styles.inputContainer}>
        <Text style={styles.legend}>Contact:</Text>
        <TextInput
          style={styles.input}
          placeholder="Your Phone Number"
          value={formData.contact}
          onChangeText={(text) => setFormData({ ...formData, contact: text })}
          keyboardType="numeric"
        />
        </View>

<View style={styles.inputContainer}>
        <Text style={styles.legend}>Location:</Text>
        <TextInput
          style={styles.input}
          placeholder="Building, Street, City, Country"
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
        />
</View>

<View style={styles.inputContainer}>
        <Text style={styles.legend}>Email:</Text>
        <TextInput
          style={styles.input}
          placeholder="example@foodfind.ai"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
        />
</View>

<View style={styles.inputContainer}>
        <Text style={styles.legend}>Post Title:</Text>

        <TextInput
          style={styles.input}
          placeholder="Fresh Leftover Meal"
          value={formData.postTitle}
          onChangeText={(text) => setFormData({ ...formData, postTitle: text })}
        />
</View>

<View style={styles.inputContainer}>
        <Text style={styles.legend}>Description:</Text>

        <TextInput
          style={[styles.desc, { textAlignVertical: 'top' }]}
          placeholder="Fresh leftover tacos and coke from a house party..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
        />
</View>
<View style={styles.inputContainer}>
  <Text style={styles.legend}>Food Expiry:</Text>
  <TouchableOpacity 
    style={styles.dateButton}
    onPress={() => {
      if (Platform.OS === 'android') {
        setShowDatePicker(true);
      } else {
        setShowDatePicker(true);
      }
    }}
  >
    <Text style={styles.dateButtonText}>
      {formData.expiryDateTime.toLocaleDateString()} {formData.expiryDateTime.toLocaleTimeString()}
    </Text>
  </TouchableOpacity>

  {showDatePicker && (
    <DateTimePicker
      value={formData.expiryDateTime}
      mode="date"
      is24Hour={true}
      display="default"
      onChange={handleExpiryChange}
    />
  )}

  {showTimePicker && Platform.OS === 'android' && (
    <DateTimePicker
      value={formData.expiryDateTime}
      mode="time"
      is24Hour={true}
      display="default"
      onChange={handleExpiryChange}
    />
  )}
</View>
<View style={styles.servingSizeContainer}>
          <Text style={styles.servingSizeLabel}>Serving Size:</Text>
          <View style={styles.servingSizeRow}>
            <Picker
              enabled={!formData.customServingSize}
              selectedValue={formData.servingSize}
              style={styles.picker}
              onValueChange={(value) => setFormData({ ...formData, servingSize: value })}
            >
              <Picker.Item label="1 person" value="1" />
              <Picker.Item label="3 people" value="3" />
              <Picker.Item label="5 people" value="5" />
              <Picker.Item label="10 people" value="10" />
              <Picker.Item label="20 people" value="20" />
              <Picker.Item label="30 people" value="30" />
              <Picker.Item label="50 people" value="50" />
              <Picker.Item label="Above 50 people" value="50+" />
            </Picker>
          </View>
          
          <View style={styles.checkboxContainer}>
            <Checkbox
              value={formData.customServingSize}
              onValueChange={(value) => 
                setFormData({ 
                  ...formData, 
                  customServingSize: value,
                  servingSize: value ? '' : '1'
                })
              }
              color={formData.customServingSize ? '#2E7D32' : undefined}
            />
            <Text style={styles.checkboxLabel}>Custom serving size</Text>
          </View>

          {formData.customServingSize && (
            <TextInput
              style={styles.db}
              placeholder="Enter custom serving size"
              value={formData.customServingValue}
              onChangeText={(text) => setFormData({ ...formData, customServingValue: text })}
              keyboardType="numeric"
            />
          )}
        </View>
        <View style={styles.inputContainer}>
        <Text style={styles.legend}>Post Passcode:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter post management passcode"
          value={formData.postPassword}
          onChangeText={(text) => setFormData({ ...formData, postPassword: text })}
          secureTextEntry
        />
      </View>

        <View style={styles.imageButtonsContainer}>
          <TouchableOpacity style={[styles.imageButton, { flex: 1, marginRight: 8 }]} onPress={pickImage}>
            <MaterialCommunityIcons name="cloud-upload" size={18} color="#FFFFFF" />
            <Text style={styles.imageButtonText}>Add Food Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.imageButton, { flex: 1 }]} onPress={takePicture}>
            <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" />
            <Text style={styles.imageButtonText}>Take Food Photo</Text>
          </TouchableOpacity>
        </View>

        {formData.imageUri && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: formData.imageUri }} style={styles.image} />
          </View>
        )}

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.submitButtonText}>Submit Donation</Text>
              <MaterialCommunityIcons style={{ marginLeft: 6 }} name="check-circle" size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formWrapper: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#F1F8E9',
    borderRadius: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2E7D32',
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#232B2B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  db: {
    borderWidth: 1,
    borderColor: '#232B2B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 5,
    fontSize: 16,
  },
  desc: {
    borderWidth: 1,
    borderColor: '#232B2B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    height: 150,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  imageButtonText: {
    color: '#FFFFFF',
    marginLeft: 5,
    fontSize: 13,
    fontWeight: 'bold',
  },
  imagePreview: {
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  servingSizeContainer: {
    marginBottom: 5,
  },
  servingSizeLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#424242',
  },
  legend: {
    fontSize: 16,
    marginBottom: 8,
    color: '#424242',
  },
  servingSizeRow: {
    borderWidth: 1,
    borderColor: '#232B2B',
    borderRadius: 8,
    marginBottom: 8,
  },
  picker: {
    height: 53,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#424242',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    height: 220,
    backgroundColor: '#4CAF50',
    overflow: 'hidden',
    borderBottomRightRadius: '15%',
    borderBottomLeftRadius: '15%',
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerIcon: {
    marginBottom: 10,
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#232B2B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#424242',
  },
});