import React, { useState } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDatabase, ref, get } from 'firebase/database';

const imageUriToGenerativePart = async (uri, mimeType) => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64data,
            mimeType,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };
  }
};

export default function ForagedFoodScreen() {
  const [image, setImage] = useState(null);
  const [foodInfo, setFoodInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeImage = async (imageUri) => {
    setIsLoading(true);
    try {
      const db = getDatabase();
      const apiKeySnapshot = await get(ref(db, 'Gemini API/apiKey'));
      const apiKey = apiKeySnapshot.val();

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const imagePart = await imageUriToGenerativePart(imageUri, "image/jpeg");

      const prompt = `Analyze the provided image of foraged food and return a detailed analysis in JSON format. 
The JSON should follow this structure exactly:
{
  "name": string,
  "nutritionalValue": {
    "calories": number,
    "protein": string and number,
    "fiber": string and number,
    "vitamins": string and number
  },
  "toxicity": string,
  "quality": "Description of food quality based on the image, tell about it on the basis of the image",
  "shelfLife": "Expected shelf life based on the image and on the basis of how it looks",
  "notes": "Additional important notes"
}
Do not include any extra text or formatting.`;

      const generatedContent = await model.generateContent([prompt, imagePart]);
      let responseText = generatedContent.response.text();
      console.log(responseText);

      responseText = responseText.replace(/```json\s*/g, '').replace(/```/g, '').trim();
      const parsedResponse = JSON.parse(responseText);
      setFoodInfo(parsedResponse);
      setShowModal(true);
    } catch (error) {
      console.error("Error analyzing image:", error);
    } finally {
      setIsLoading(false);
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
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImage(uri);
        analyzeImage(uri);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      analyzeImage(uri);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.container}>
        
          <View style={styles.header}>
            <View style={styles.headerOverlay}>
              <MaterialCommunityIcons name="leaf" size={45} color="#FFFFFF" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Foraged Food AI</Text>
              <Text style={styles.headerSubtitle}>
                Snap a photo of the food you've foraged, and let our AI determine if it's safe to eat
              </Text>
            </View>
          </View>

        {!image ? (
          <View style={styles.uploadContainer}>
            <MaterialCommunityIcons name="camera-plus" size={64} color="#2E7D32" />
            <Text style={styles.uploadText}>
              Take a picture or upload an image of the foraged food you've found
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={takePicture}>
                <Text style={styles.buttonText}>Take Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={pickImage}>
                <Text style={styles.buttonText}>Upload Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                setImage(null);
                setFoodInfo(null);
              }}
            >
              <Text style={styles.resetButtonText}>Take New Picture</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardsContainer}>
          <View style={styles.card}>
            <MaterialCommunityIcons name="leaf" size={40} color="#2E7D32" />
            <Text style={styles.cardTitle}>Foraged Freshness</Text>
            <Text style={styles.cardDescription}>
              Discover wild, natural flavors and nutrient-rich foods.
            </Text>
          </View>
          <View style={styles.card}>
            <MaterialCommunityIcons name="shield-check" size={40} color="#2E7D32" />
            <Text style={styles.cardTitle}>Safety Analysis</Text>
            <Text style={styles.cardDescription}>
              Our AI quickly determines if your finds are safe to eat.
            </Text>
          </View>
          <View style={styles.card}>
            <MaterialCommunityIcons name="nutrition" size={40} color="#2E7D32" />
            <Text style={styles.cardTitle}>Nutritional Value</Text>
            <Text style={styles.cardDescription}>
              Our cutting-edge technology evaluates the nutritional profile of your finds.
            </Text>
          </View>
        </View>

        <Modal
          visible={showModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ScrollView>
                {foodInfo && (
                  <>
                    <Text style={styles.modalTitle}>{foodInfo.name}</Text>
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>Nutritional Value</Text>
                      <Text>
                        <Text style={styles.modalcnt}>Calories:</Text> {foodInfo.nutritionalValue.calories}
                      </Text>
                      <Text>
                        <Text style={styles.modalcnt}>Protein:</Text> {foodInfo.nutritionalValue.protein}
                      </Text>
                      <Text>
                        <Text style={styles.modalcnt}>Fiber:</Text> {foodInfo.nutritionalValue.fiber}
                      </Text>
                      <Text>
                        <Text style={styles.modalcnt}>Vitamins:</Text> {foodInfo.nutritionalValue.vitamins}
                      </Text>
                    </View>
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>Safety & Quality</Text>
                      <Text>
                        <Text style={styles.modalcnt}>Toxicity:</Text> {foodInfo.toxicity}
                      </Text>
                      <Text>
                        <Text style={styles.modalcnt}>Quality:</Text> {foodInfo.quality}
                      </Text>
                      <Text>
                        <Text style={styles.modalcnt}>Shelf Life:</Text> {foodInfo.shelfLife}
                      </Text>
                    </View>
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>Additional Notes</Text>
                      <Text>{foodInfo.notes}</Text>
                    </View>
                  </>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isLoading} transparent={true}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Analyzing image...</Text>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 220,
    backgroundColor: '#4CAF50',
    overflow: 'hidden',
    borderBottomRightRadius: '15%',
    borderBottomLeftRadius: '15%'
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
    marginTop: 20
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
  uploadContainer: {
    margin: 20,
    padding: 30,
    borderRadius: 15,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32'
  },
  uploadText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    color: '#424242',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
    width: '45%',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    padding: 20,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  resetButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  resetButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  cardsContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#F1F8E9',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginVertical: 10,
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#424242',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2E7D32',
  },
  modalcnt: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#424242',
  },
  closeButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
