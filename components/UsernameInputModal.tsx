import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';

interface UsernameInputModalProps {
  visible: boolean;
  onClose: () => void;
  onUserIdSet: (userId: string) => void;
}

const USER_ID_KEY = 'app_user_id';

const UsernameInputModal: React.FC<UsernameInputModalProps> = ({ visible, onClose, onUserIdSet }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetUsername = async () => {
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Generate user ID
      const randomNumber = Math.floor(1000000 + Math.random() * 9000000); // 7-digit random number
      const userId = `${username.trim().toLowerCase()}${randomNumber}`;

      // Call the registration API
      const response = await fetch(`http://faras1334.pythonanywhere.com/registerid?id=${encodeURIComponent(userId)}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) { // Conflict - ID already exists
          // This case should be rare due to the random number, but handle it
          setError(errorData.error || 'This username is already taken. Please try a different one or restart the app.');
        } else {
          setError(errorData.error || 'Failed to register user ID. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Save user ID locally
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      onUserIdSet(userId);
      setIsLoading(false);
      onClose(); // Close modal on success
    } catch (e) {
      console.error('Failed to set username or register ID:', e);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        // Prevent closing by back button if loading or if it's the initial setup
        // For now, allow closing, but this could be made stricter
        if (!isLoading) {
          onClose();
        }
      }}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Welcome!</Text>
          <Text style={styles.modalText}>Please enter a username to continue.</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username (e.g., alex)"
            placeholderTextColor={Colors.dark.subText}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSetUsername}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.dark.text} />
            ) : (
              <Text style={styles.buttonText}>Set Username</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 15,
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.dark.subText,
    fontSize: 16,
  },
  input: {
    height: 50,
    borderColor: Colors.dark.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
    width: '100%',
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 2,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.dark.secondary,
  },
  buttonText: {
    color: Colors.dark.text,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    color: Colors.dark.error,
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default UsernameInputModal;