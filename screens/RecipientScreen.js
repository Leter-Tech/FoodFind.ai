import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Share,
  Linking,
  Platform,
  Clipboard,
  Alert,
  StatusBar,
} from 'react-native';
import { Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, remove, get, push, update } from 'firebase/database';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Checkbox from 'expo-checkbox';
const firebaseConfig = "REMOVED"


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const STATUS_OPTIONS = [
  'Accepting',
  'Not Accepting',
  'Food Expiring Soon',
  'Some People Have Approached But Still Accepting',
  'All Portions Reserved',
  'Limited Portions Left',
  'Collection in Progress',
  'Special Dietary Requirements Available',
  'Vegetarian Only',
  'Non-Veg Available',
  'First Come First Serve'
];

export default function RecipientScreen() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [analyzingNutrition, setAnalyzingNutrition] = useState(false);
  const [nutritionInfo, setNutritionInfo] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [selectedDonationId, setSelectedDonationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDonations, setFilteredDonations] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryFormData, setDeliveryFormData] = useState({
    recipientName: '',
    recipientContact: '',
    recipientLocation: '',
  });
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [customStatus, setCustomStatus] = useState(false);
  const [customStatusText, setCustomStatusText] = useState('');
  

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredDonations(donations);
      return;
    }
  
    const searchTerms = query.toLowerCase().trim().split(' ');
    const filtered = donations.filter(donation => {
      const searchableFields = [
        donation.location,
        donation.date,
        donation.name,
        donation.email,
        donation.servingSize,
        donation.customServingValue,
        donation.postTitle,
        donation.description
      ].map(field => String(field).toLowerCase());
  
      return searchTerms.every(term =>
        searchableFields.some(field => field.includes(term))
      );
    });
  
    setFilteredDonations(filtered);
  };

  useEffect(() => {
    fetchDonations();
  }, []);

const fetchDonations = () => {
  const donationsRef = query(ref(database, 'surplusFood'), orderByChild('timestamp'));
  
  onValue(donationsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const donationsList = Object.entries(data).map(([id, values]) => ({
        id,
        ...values,
      })).reverse();
      setDonations(donationsList);
      setFilteredDonations(donationsList);
    }
    setLoading(false);
    setRefreshing(false);
  });
};

  const handleDelete = async (donationId) => {
    setSelectedDonationId(donationId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const donationRef = ref(database, `surplusFood/${selectedDonationId}`);
      const snapshot = await get(donationRef);
      const donation = snapshot.val();
  
      if (donation.postPassword === deletePassword) {
        await remove(donationRef);
        setShowDeleteModal(false);
        setDeletePassword('');
        setSelectedDonationId(null);
      } else {
        alert('Incorrect password');
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert('Error deleting post');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDonations();
  };

  const analyzeImage = async (imageUri) => {
    setAnalyzingNutrition(true);
    setNutritionInfo(null);
    try {
      const db = getDatabase();
      const apiKeySnapshot = await get(ref(db, 'Gemini API/apiKey'));
      const apiKey = apiKeySnapshot.val();

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const imagePart = {
        inlineData: {
          data: imageUri.split(',')[1],
          mimeType: "image/jpeg",
        },
      };

      const prompt = `Analyze the provided image of food and return a detailed analysis in JSON format with the following structure:
{
  "name": "Food name",
  "nutritionalValue": {
    "calories": "X calories",
    "protein": "X grams",
    "fiber": "X grams",
    "vitamins": "List of vitamins"
  },
  "quality": "Description of food quality based on the image, tell about it on the basis of the image",
  "shelfLife": "Expected shelf life based on the image and on the basis of how it looks",
  "notes": "Additional important notes"
}`;

      const generatedContent = await model.generateContent([prompt, imagePart]);
      const responseText = generatedContent.response.text().replace(/```json\s*/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(responseText);
      setNutritionInfo(result);
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert('Error analyzing image. Please try again.');
    } finally {
      setAnalyzingNutrition(false);
    }
  };


  const handleNutritionPress = async (donation) => {
    setShowNutritionModal(true);
    await analyzeImage(donation.imageUri);
  };

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleShare = async (donation) => {
    try {
      const message = `
🍱 Title: ${donation.postTitle}
📝 Description: ${donation.description}
📍 Location: ${donation.location}
📅 Date: ${donation.date}
👤 Contact: ${donation.name}
📞 Phone: ${donation.contact}
✉️ Email: ${donation.email}
🍽️ Serves: ${donation.customServingSize ? `${donation.customServingValue} people` : `${donation.servingSize} ${donation.servingSize === '50+' ? 'people' : 'people'}`}

-Sent from FoodFind AI app
`;

      await Share.share({
        message,
        title: donation.postTitle,
        url: donation.imageUri
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const toggleMenu = (donationId) => {
    setMenuVisible(menuVisible === donationId ? null : donationId);
  };

  const handleOpenLocation = (location) => {
    const encodedLocation = encodeURIComponent(location);
    const url = Platform.select({
      ios: `maps://app?q=${encodedLocation}`,
      android: `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
    });
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        alert('Unable to open maps');
      })
      .catch((err) => console.error('Error opening maps:', err));
  };

  const handleRequestDelivery = (donation) => {
    setSelectedDonation(donation);
    setShowDeliveryModal(true);
  };

  const handleDeliverySubmit = async () => {
    if (!deliveryFormData.recipientName || !deliveryFormData.recipientContact || !deliveryFormData.recipientLocation) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const deliveryRef = ref(database, 'deliveryRequests');
      await push(deliveryRef, {
        ...deliveryFormData,
        donorName: selectedDonation.name,
        donorContact: selectedDonation.contact,
        donorLocation: selectedDonation.location,
        foodTitle: selectedDonation.postTitle,
        foodDescription: selectedDonation.description,
        timestamp: new Date().toLocaleString(),
        status: 'pending',
        otp: otp,
        expiryDate: selectedDonation.expiryDateTime
      });

      setShowDeliveryModal(false);
      setDeliveryFormData({
        recipientName: '',
        recipientContact: '',
        recipientLocation: '',
      });
      setSelectedDonation(null);

      Alert.alert(
        'Delivery Request Submitted',
        `Your delivery request has been submitted successfully!\n\nYour OTP is: ${otp}\n\nPlease save this OTP in order to complete the delivery request or change the delivery volunteer. The request will automatically expire in 24 hours if not completed.`,
        [
          {
            text: 'Copy OTP',
            onPress: () => Clipboard.setString(otp)
          },
          {
            text: 'OK'
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting delivery request:', error);
      alert('Error submitting request. Please try again.');
    }
  };

  const handleStatusChange = async (donationId, currentPassword) => {
    if (!donationId) {
      console.error("No donation ID provided");
      alert('Error: Could not identify the post');
      return;
    }

    try {
      const donationRef = ref(database, `surplusFood/${donationId}`);
      const snapshot = await get(donationRef);
      const donation = snapshot.val();

      if (!donation) {
        console.error("No donation found with ID:", donationId);
        alert('Post not found');
        return;
      }

      if (donation.postPassword === currentPassword) {
        await update(donationRef, {
          status: customStatus ? customStatusText : selectedStatus
        });
        setShowStatusModal(false);
        setSelectedStatus('');
        setCustomStatus(false);
        setCustomStatusText('');
        setDeletePassword('');
        setSelectedDonationId(null);
      } else {
        alert('Incorrect password');
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert('Error updating status');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerOverlay}>
            <MaterialCommunityIcons name="food" size={45} color="#FFFFFF" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Find Food</Text>
            <Text style={styles.headerSubtitle}>
              Browse and connect with generous food donors in your nearby places
            </Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { paddingTop: StatusBar.currentHeight || 20 }]}>
          <Searchbar
            placeholder="Search places, food and more..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor="#2E7D32"
            placeholderTextColor="#666"
          />
        </View>

        {filteredDonations.map((donation) => (
          <View key={donation.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{donation.postTitle}</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleNutritionPress(donation)}
              >
                <MaterialCommunityIcons name="nutrition" size={30} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => toggleMenu(donation.id)}
              >
    <MaterialCommunityIcons 
      name={menuVisible === donation.id ? "close" : "dots-vertical"} 
      size={30} 
      color="#2E7D32" 
    />
              </TouchableOpacity>
            
            {menuVisible === donation.id && (
              <View style={styles.menuPopup}>
                {donation.contact && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      handleCall(donation.contact);
                      toggleMenu(null);
                    }}
                  >
                    <MaterialCommunityIcons name="phone" size={24} color="#2E7D32" />
                    <Text style={styles.menuText}>Contact</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleShare(donation);
                    toggleMenu(null);
                  }}
                >
                  <MaterialCommunityIcons name="share-variant" size={24} color="#2E7D32" />
                  <Text style={styles.menuText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleDelete(donation.id);
                    toggleMenu(null);
                  }}
                >
                  <MaterialCommunityIcons name="delete" size={24} color="#2E7D32" />
                  <Text style={styles.menuText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleOpenLocation(donation.location);
                    toggleMenu(null);
                  }}
                >
                  <MaterialCommunityIcons name="map-marker" size={24} color="#2E7D32" />
                  <Text style={styles.menuText}>Open Location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleRequestDelivery(donation);
                    toggleMenu(null);
                  }}
                >
                  <MaterialCommunityIcons name="truck-delivery" size={24} color="#2E7D32" />
                  <Text style={styles.menuText}>Request Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setSelectedDonationId(donation.id);
                    setShowStatusModal(true);
                    toggleMenu(null);
                  }}
                >
                  <MaterialCommunityIcons name="message-badge" size={24} color="#2E7D32" />
                  <Text style={styles.menuText}>Change Status</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {donation.imageUri && (
            <Image
              source={{ uri: donation.imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          )}

          <View style={styles.cardContent}>
            <Text style={styles.description}>{donation.description}</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={22} color="#2E7D32" />
                <Text style={styles.detailText}>{donation.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="calendar" size={22} color="#2E7D32" />
                <Text style={styles.detailText}>{donation.date}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="account" size={22} color="#2E7D32" />
                <Text style={styles.detailText}>{donation.name}</Text>
              </View>
              {donation.contact && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="phone" size={22} color="#2E7D32" />
                  <Text style={styles.detailText}>{donation.contact}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="email" size={22} color="#2E7D32" />
                <Text style={styles.detailText}>{donation.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="room-service" size={22} color="#2E7D32" />
                <Text style={styles.detailText}>
                  Serves: {donation.customServingSize ? `${donation.customServingValue} people` : `${donation.servingSize} ${donation.servingSize === '50+' ? 'people' : 'people'}`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-alert" size={22} color="#2E7D32" />
                <Text style={styles.detailText}>
                  Expires: {new Date(donation.expiryDateTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'numeric', day: 'numeric' })}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="message-badge" size={22} color="#2E7D32" />
                <Text style={[
                  styles.detailText
                ]}>
                  Status: {donation.status}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Post</Text>
            <Text style={styles.modalText}>Enter post password to delete:</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNutritionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowNutritionModal(false);
          setNutritionInfo(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              {analyzingNutrition ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="large" color="#2E7D32" />
                  <Text style={styles.analyzingText}>Analyzing food...</Text>
                </View>
              ) : nutritionInfo ? (
                <>
                  <Text style={styles.modalTitle}>{nutritionInfo.name}</Text>
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Nutritional Value</Text>
                    <Text>
                      <Text style={styles.modalLabel}>Calories:</Text> {nutritionInfo.nutritionalValue.calories}
                    </Text>
                    <Text>
                      <Text style={styles.modalLabel}>Protein:</Text> {nutritionInfo.nutritionalValue.protein}
                    </Text>
                    <Text>
                      <Text style={styles.modalLabel}>Fiber:</Text> {nutritionInfo.nutritionalValue.fiber}
                    </Text>
                    <Text>
                      <Text style={styles.modalLabel}>Vitamins:</Text> {nutritionInfo.nutritionalValue.vitamins}
                    </Text>
                  </View>
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Safety & Quality</Text>
                    <Text>
                      <Text style={styles.modalLabel}>Quality:</Text> {nutritionInfo.quality}
                    </Text>
                    <Text>
                      <Text style={styles.modalLabel}>Shelf Life:</Text> {nutritionInfo.shelfLife}
                    </Text>
                  </View>
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Additional Notes</Text>
                    <Text>{nutritionInfo.notes}</Text>
                  </View>
                </>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowNutritionModal(false);
                setNutritionInfo(null);
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeliveryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Delivery</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              value={deliveryFormData.recipientName}
              onChangeText={(text) => setDeliveryFormData({...deliveryFormData, recipientName: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Your Contact Number"
              value={deliveryFormData.recipientContact}
              onChangeText={(text) => setDeliveryFormData({...deliveryFormData, recipientContact: text})}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Your Location"
              value={deliveryFormData.recipientLocation}
              onChangeText={(text) => setDeliveryFormData({...deliveryFormData, recipientLocation: text})}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeliveryModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#2E7D32' }]}
                onPress={handleDeliverySubmit}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Status</Text>
            
            <View style={styles.customStatusContainer}>
              <View style={styles.checkboxContainer}>
                <Checkbox
                  value={customStatus}
                  onValueChange={setCustomStatus}
                  color={customStatus ? '#2E7D32' : undefined}
                />
                <Text style={styles.checkboxLabel}>Use Custom Status</Text>
              </View>
              {customStatus && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter custom status"
                  value={customStatusText}
                  onChangeText={setCustomStatusText}
                />
              )}
            </View>

            {!customStatus && (
              <ScrollView style={styles.statusScrollView}>
                {STATUS_OPTIONS.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      selectedStatus === status && styles.selectedStatus
                    ]}
                    onPress={() => setSelectedStatus(status)}
                    disabled={customStatus}
                  >
                    <Text style={[
                      styles.statusText,
                      selectedStatus === status && styles.selectedStatusText
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter post password"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedStatus('');
                  setCustomStatus(false);
                  setCustomStatusText('');
                  setDeletePassword('');
                  setSelectedDonationId(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#2E7D32' }]}
                onPress={() => handleStatusChange(selectedDonationId, deletePassword)}
                disabled={(!customStatus && !selectedStatus) || (customStatus && !customStatusText)}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
);
}



const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    scrollView: {
      flex: 1,
    },
    searchContainer: {
      padding: 10,
      backgroundColor: '#fff',
    },
    searchBar: {
      borderRadius: 10,
      elevation: 4,
      backgroundColor: '#F1F8E9',
      borderWidth: 2,
      borderColor: '#2E7D32'
    },
    searchInput: {
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      backgroundColor: '#F1F8E9',
      borderRadius: 16,
      margin: 12,
      marginBottom: 20,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#2E7D32'
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      flex: 1,
      marginRight: 8,
      color: '#2E7D32',
      letterSpacing: 0.25,
    },
    iconButton: {
      padding: 5,
      marginLeft: 8,
    },
    image: {
      width: '100%',
      height: 200,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    cardContent: {
      padding: 16,
    },
    description: {
      fontSize: 16,
      color: '#424242',
      marginBottom: 5,
      lineHeight: 24,
    },
    detailsContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E7D32'
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#2E7D32',
      paddingBottom: 12,
    },
    detailText: {
      marginLeft: 12,
      fontSize: 16,
      color: '#37474F',
      flex: 1,
      letterSpacing: 0.3,
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
    passwordInput: {
      borderWidth: 1,
      borderColor: '#CCCCCC',
      borderRadius: 8,
      padding: 12,
      marginVertical: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      marginHorizontal: 5,
    },
    cancelButton: {
      backgroundColor: '#2E7D32',
    },
    deleteButton: {
      backgroundColor: '#e03732'
    },
    buttonText: {
      color: '#FFFFFF',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    modalText: {
      fontSize: 16,
      color: '#424242',
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
    modalLabel: {
      fontWeight: 'bold',
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
    analyzingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    analyzingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#666',
    },
    noResultsContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 100,
    },
    noResultsText: {
      marginTop: 10,
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
    },
    menuPopup: {
      position: 'absolute',
      top: 60,
      right: 10,
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 8,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 1000,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    menuText: {
      marginLeft: 12,
      fontSize: 16,
      color: '#424242',
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
    input: {
      borderWidth: 1,
      borderColor: '#CCCCCC',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
    },
    statusScrollView: {
      maxHeight: 300,
      marginBottom: 16,
    },
    statusOption: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: '#F1F8E9',
    },
    selectedStatus: {
      backgroundColor: '#2E7D32',
    },
    statusText: {
      fontSize: 16,
      color: '#2E7D32',
    },
    selectedStatusText: {
      color: '#FFFFFF',
    },
    customStatusContainer: {
      marginBottom: 0,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    checkboxLabel: {
      marginLeft: 8,
      fontSize: 16,
      color: '#424242',
    },
  });