import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  BackHandler,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function FoodBankScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [address, setAddress] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [webViewProgress, setWebViewProgress] = useState(0);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    const backAction = () => {
      if (showWebView) {
        setShowWebView(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showWebView]);

  const handleShouldStartLoadWithRequest = (request) => {
    const allowedPrefix = 'https://www.google.com/maps/search/?api=1&query=';
    if (request.url.startsWith(allowedPrefix)) {
      return true;
    } else {
      Linking.canOpenURL(request.url).then((supported) => {
        if (supported) {
          Linking.openURL(request.url);
        } else {
          console.log("Don't know how to open URI: " + request.url);
        }
      });
      return false;
    }
  };

  const handleUseMyLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please type your location instead.');
        setIsLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const url = `https://www.google.com/maps/search/?api=1&query=food banks in ${lat},${lng}`;
      setWebViewUrl(url);
      setShowWebView(true);
    } catch (error) {
      console.error(error);
      setErrorMsg('Unable to fetch location. Please try again or type your location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSubmitAddress = () => {
    if (address.trim() === '') return;
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=food banks in ${encodedAddress}`;
    setWebViewUrl(url);
    setShowWebView(true);
  };

  if (showWebView) {
    return (
      <View style={styles.webViewContainer}>
        {webViewProgress < 1 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${webViewProgress * 100}%` }]} />
          </View>
        )}
        <WebView
          source={{ uri: webViewUrl }}
          onLoadProgress={({ nativeEvent }) => setWebViewProgress(nativeEvent.progress)}
          startInLoadingState={true}
          renderLoading={() => (
            <ActivityIndicator size="large" color="#2E7D32" style={styles.webViewLoader} />
          )}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerOverlay}>
              <MaterialCommunityIcons name="warehouse" size={45} color="#FFFFFF" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Food Bank Finder</Text>
              <Text style={styles.headerSubtitle}>
                Quickly locate nearby food banks to access nutritious meals and support
              </Text>
            </View>
          </View>

        <View style={styles.formContainer}>
          <TouchableOpacity style={styles.locationButton} onPress={handleUseMyLocation}>
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="target" size={20} color="#FFFFFF" style={styles.icon} />
                <Text style={styles.locationButtonText}>Use My Location</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.orText}>OR</Text>
          <View style={styles.addressContainer}>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter your address"
              placeholderTextColor="#424242"
              value={address}
              onChangeText={setAddress}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAddress}>
              <Text style={styles.submitButtonText}>Submit</Text>
              <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" style={styles.icon1} />
            </TouchableOpacity>
          </View>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </View>

        <View style={styles.cardsContainer}>
          <View style={styles.card}>
            <MaterialCommunityIcons name="warehouse" size={40} color="#2E7D32" />
            <Text style={styles.cardTitle}>Food Bank Network</Text>
            <Text style={styles.cardDescription}>
              Find vital food banks in your community.
            </Text>
          </View>
          <View style={styles.card}>
            <MaterialCommunityIcons name="handshake" size={40} color="#2E7D32" />
            <Text style={styles.cardTitle}>Trusted Resources</Text>
            <Text style={styles.cardDescription}>
              Verified and reliable food bank locations.
            </Text>
          </View>
          <View style={styles.card}>
            <MaterialCommunityIcons name="map-marker" size={40} color="#2E7D32" />
            <Text style={styles.cardTitle}>Easy Navigation</Text>
            <Text style={styles.cardDescription}>
              Navigate easily with detailed directions.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    marginRight: 6,
  },
  icon1: {
    marginLeft: 6,
  },
  contentContainer: {
    paddingBottom: 20,
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
  formContainer: {
    margin: 20,
    alignItems: 'center',
  },
  locationButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  addressInput: {
    flex: 1,
    borderColor: '#424242',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
    color: '#424242',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#B00020',
    marginTop: 10,
    textAlign: 'center',
  },
  cardsContainer: {
    margin: 20,
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
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2E7D32',
  },
  webViewLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
  },
});
