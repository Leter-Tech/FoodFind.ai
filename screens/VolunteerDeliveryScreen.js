import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Clipboard,
  Alert,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Searchbar } from 'react-native-paper';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, update, remove } from 'firebase/database';

const firebaseConfig = "REMOVED"


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function VolunteerDeliveryScreen() {
  const [deliveryRequests, setDeliveryRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [enteredOTP, setEnteredOTP] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [volunteerData, setVolunteerData] = useState({
    name: '',
    contact: ''
  });

  useEffect(() => {
    const requestsRef = query(ref(database, 'deliveryRequests'), orderByChild('timestamp'));
    
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsList = Object.entries(data).map(([id, values]) => ({
          id,
          ...values,
        })).reverse();
        setDeliveryRequests(requestsList);
        setFilteredRequests(requestsList);
      } else {
        setDeliveryRequests([]);
        setFilteredRequests([]);
      }
    }, (error) => {
      console.error("Error fetching delivery requests:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [deliveryRequests, searchQuery]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredRequests(deliveryRequests);
      return;
    }

    const filtered = deliveryRequests.filter(request => {
      const searchableFields = [
        request.donorLocation,
        request.recipientLocation,
        request.foodTitle,
        request.donorName,
        request.recipientName
      ].map(field => String(field).toLowerCase());

      return searchableFields.some(field => field.includes(query.toLowerCase()));
    });

    setFilteredRequests(filtered);
  };

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleAcceptRequest = (requestId) => {
    setSelectedRequestId(requestId);
    setShowVolunteerModal(true);
  };

  const submitVolunteerInfo = async () => {
    if (!volunteerData.name || !volunteerData.contact) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const requestRef = ref(database, `deliveryRequests/${selectedRequestId}`);
      await update(requestRef, {
        volunteerName: volunteerData.name,
        volunteerContact: volunteerData.contact,
        volunteerTimestamp: new Date().toLocaleString(),
        status: 'accepted'
      });

      setShowVolunteerModal(false);
      setVolunteerData({ name: '', contact: '' });
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleFinishDelivery = (requestId) => {
    setSelectedRequestId(requestId);
    setShowFinishModal(true);
  };

  const handleDismissVolunteer = (requestId) => {
    setSelectedRequestId(requestId);
    setShowDismissModal(true);
  };

  const verifyAndFinishDelivery = async () => {
    const request = deliveryRequests.find(r => r.id === selectedRequestId);
    if (request && request.otp === enteredOTP) {
      try {
        await remove(ref(database, `deliveryRequests/${selectedRequestId}`));
        setShowFinishModal(false);
        setEnteredOTP('');
        Alert.alert('Success', 'Delivery completed successfully!');
      } catch (error) {
        Alert.alert('Error', 'Failed to complete delivery');
      }
    } else {
      Alert.alert('Error', 'Invalid OTP');
    }
  };

  const verifyAndDismissVolunteer = async () => {
    const request = deliveryRequests.find(r => r.id === selectedRequestId);
    if (request && request.otp === enteredOTP) {
      try {
        const requestRef = ref(database, `deliveryRequests/${selectedRequestId}`);
        await update(requestRef, {
          volunteerName: null,
          volunteerContact: null,
          volunteerTimestamp: null,
          status: 'pending'
        });
        setShowDismissModal(false);
        setEnteredOTP('');
      } catch (error) {
        Alert.alert('Error', 'Failed to dismiss volunteer');
      }
    } else {
      Alert.alert('Error', 'Invalid OTP');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.header}>
          <View style={styles.headerOverlay}>
            <MaterialCommunityIcons name="truck-delivery" size={45} color="#FFFFFF" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Volunteer Delivery</Text>
            <Text style={styles.headerSubtitle}>
              Deliver nourishment and care to those in need in your nearby locations
            </Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { paddingTop: StatusBar.currentHeight || 20 }]}>
          <Searchbar
            placeholder="Search locations..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#2E7D32"
          />
        </View>

        {filteredRequests.map((request) => (
          <View key={request.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{request.foodTitle}</Text>
              <MaterialCommunityIcons 
                name={request.status === 'pending' ? "clock-outline" : "check-circle"} 
                size={24} 
                color={request.status === 'pending' ? "#2E7D32" : "#2E7D32"} 
              />
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.description}>{request.foodDescription}</Text>
              
              <View style={styles.sectionn}>
                <Text style={styles.sectionTitle}>Donor Details</Text>
                <Text style={styles.detailText}>Name: {request.donorName}</Text>
                <Text style={styles.detailText}>Contact: {request.donorContact}</Text>
                <Text style={styles.detailText}>Location: {request.donorLocation}</Text>
              </View>

              <View style={styles.sectionn}>
                <Text style={styles.sectionTitle}>Recipient Details</Text>
                <Text style={styles.detailText}>Name: {request.recipientName}</Text>
                <Text style={styles.detailText}>Contact: {request.recipientContact}</Text>
                <Text style={styles.detailText}>Location: {request.recipientLocation}</Text>
              </View>

              <View style={styles.timestampContainer}>
                <View style={styles.timestampBox}>
                  <Text style={styles.timestampLabel}>REQUESTED ON</Text>
                  <Text style={styles.timestampDate}>
                    {request.timestamp.split(',')[0]}
                  </Text>
                  <Text style={styles.timestampTime}>
                    {request.timestamp.split(',')[1].trim().replace(/:\d{2}\s/, ' ')}
                  </Text>
                </View>
                <View style={[styles.timestampBox, styles.expiryBox]}>
                  <Text style={styles.expiryLabel}>EXPIRES ON</Text>
                  <Text style={styles.expiryDate}>
                    {new Date(request.expiryDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.expiryTime}>
                    {new Date(request.expiryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              {request.volunteerName && (
                <View style={styles.volunteerInfo}>
                  <View style={styles.volunteerHeader}>
                    <MaterialCommunityIcons name="account-check" size={24} color="#2E7D32" />
                    <Text style={styles.volunteerHeaderText}>Volunteer Assigned</Text>
                  </View>
                  <View style={styles.volunteerDetails}>
                    <Text style={styles.volunteerName}>
                      {request.volunteerName}
                    </Text>
                    <Text style={styles.volunteerContact}>
                      {request.volunteerContact}
                    </Text>
                    <Text style={styles.volunteerTimestamp}>
                      Accepted on: {request.volunteerTimestamp}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.buttonContainer}>
                {request.status === 'pending' ? (
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => handleAcceptRequest(request.id)}
                  >
                    <Text style={styles.buttonText}>Accept Request</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.button, styles.finishButton]}
                      onPress={() => handleFinishDelivery(request.id)}
                    >
                      <Text style={styles.buttonText}>Finish Delivery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.dismissButton]}
                      onPress={() => handleDismissVolunteer(request.id)}
                    >
                      <Text style={styles.buttonText}>Dismiss Volunteer</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        ))}

        <Modal
          visible={showVolunteerModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Accept Delivery Request</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                value={volunteerData.name}
                onChangeText={(text) => setVolunteerData({...volunteerData, name: text})}
              />
              <TextInput
                style={styles.input}
                placeholder="Your Contact"
                value={volunteerData.contact}
                onChangeText={(text) => setVolunteerData({...volunteerData, contact: text})}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowVolunteerModal(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.acceptButton]}
                  onPress={submitVolunteerInfo}
                >
                  <Text style={styles.buttonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showFinishModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Finish Delivery</Text>
              <Text style={styles.modalText}>Enter the delivery OTP:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                value={enteredOTP}
                onChangeText={setEnteredOTP}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowFinishModal(false);
                    setEnteredOTP('');
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.finishButton]}
                  onPress={verifyAndFinishDelivery}
                >
                  <Text style={styles.buttonText}>Finish</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDismissModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Dismiss Volunteer</Text>
              <Text style={styles.modalText}>Enter the delivery OTP to confirm:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                value={enteredOTP}
                onChangeText={setEnteredOTP}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowDismissModal(false);
                    setEnteredOTP('');
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.dismissButton]}
                  onPress={verifyAndDismissVolunteer}
                >
                  <Text style={styles.buttonText}>Dismiss</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#F1F8E9',
    borderRadius: 16,
    margin: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#2E7D32'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    flex: 1,
  },
  cardContent: {
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 3,
  },
  section: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  sectionn: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E7D32'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
  timestampContainer: {
    flexDirection: 'row',
    marginVertical: 12,
    gap: 12,
  },
  timestampBox: {
    flex: 1,
    backgroundColor: '#EBF3FF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1565C0'
  },
  expiryBox: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#E65100'
  },
  timestampLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  expiryDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F57C00',
  },
  timestampDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565C0',
  },
  timestampTime: {
    fontSize: 13,
    color: '#1565C0',
    opacity: 0.8,
    marginTop: 2,
  },
  expiryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E65100',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  expiryTime: {
    fontSize: 12,
    color: '#E65100',
    opacity: 0.8,
    marginTop: 2,
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
  volunteerInfo: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    overflow: 'hidden',
  },
  volunteerHeader: {
    backgroundColor: '#C8E6C9',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#A5D6A7',
  },
  volunteerHeaderText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  volunteerDetails: {
    padding: 12,
  },
  volunteerName: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  volunteerContact: {
    color: '#2E7D32',
    fontSize: 14,
    marginBottom: 4,
  },
  volunteerTimestamp: {
    color: '#558B2F',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#2E7D32',
  },
  finishButton: {
    backgroundColor: '#2E7D32',
  },
  dismissButton: {
    backgroundColor: '#D32F2F',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E7D32',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
});