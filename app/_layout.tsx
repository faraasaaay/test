import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from "@react-native-community/netinfo"; // Added NetInfo
import { Tabs, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react'; // Added React import
import { View } from 'react-native'; // Added AppState, Platform
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../components/MiniPlayer';
import NoticeModal, { NoticeData } from '../components/NoticeModal'; // Added NoticeModal and NoticeData
import UsernameInputModal from '../components/UsernameInputModal';
import Colors from '../constants/Colors';
import { AudioPlayerProvider, useAudioPlayer } from '../contexts/AudioPlayerContext';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

const USER_ID_KEY = 'app_user_id';
const NOTICE_API_BASE_URL = 'http://faras1334.pythonanywhere.com';

const MINI_PLAYER_HEIGHT = 67; // Define MiniPlayer height (65 for player + 2 for progress bar)
const TAB_BAR_BASE_HEIGHT = 70; // Base tab bar height without safe area

function TabsLayout() {
  const { currentSong } = useAudioPlayer();
  const router = useRouter();
  const currentRoute = router.pathname;
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}> 
      <Tabs
        sceneContainerStyle={{
          // Add padding to the bottom of screen content if MiniPlayer is visible
          // Also account for safe area bottom insets (Android navigation keys)
          paddingBottom: currentSong && currentRoute !== '/player' ? MINI_PLAYER_HEIGHT : 0,
        }}
          screenOptions={{
            tabBarStyle: {
              backgroundColor: Colors.dark.background,
              borderTopColor: Colors.dark.border,
              borderTopWidth: 1,
              height: 70 + insets.bottom, // Add bottom safe area insets for Android navigation keys
              paddingBottom: Math.max(8, insets.bottom), // Use safe area bottom or minimum padding
              paddingTop: 8, // Increased padding
              elevation: 10, // Slightly increased elevation
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 }, // Adjusted shadow
              shadowOpacity: 0.25,
              shadowRadius: 5,
            },
          tabBarActiveTintColor: Colors.dark.primary,
          tabBarInactiveTintColor: Colors.dark.subText,
          tabBarLabelStyle: {
            fontSize: 13, // Increased font size
            fontWeight: '600', // Bolder font weight
            marginBottom: 5, // Adjusted margin
          },
          tabBarIconStyle: {
            marginTop: 2, // Adjusted icon margin
          },
          headerStyle: {
            backgroundColor: Colors.dark.background,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            height: 60,
          },
          headerTintColor: Colors.dark.text,
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Search',
            headerShown: false, // Hide default header for Search screen
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="player"
          options={{
            title: 'Now Playing',
            headerShown: false, // Hide default header for Player screen
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="musical-notes" size={size} color={color} />
            ),
            href: null, // Only accessible through the mini player
          }}
        />
        </Tabs>
      {/* MiniPlayer is rendered here, on top of Tabs, positioned above the TabBar */}
      {currentSong && currentRoute !== '/player' && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: TAB_BAR_BASE_HEIGHT + insets.bottom, // Position MiniPlayer above tab bar + safe area
            height: MINI_PLAYER_HEIGHT,
            display: currentRoute === '/player' ? 'none' : 'flex', // Extra safety to ensure it's hidden on player page
          }}
        >
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState(true);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [noticeData, setNoticeData] = useState<NoticeData | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  useEffect(() => {
    const checkUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          setShowUsernameModal(true); // Show modal if no userId
        }
      } catch (e) {
        console.error('Failed to load user ID:', e);
        setShowUsernameModal(true); // Show modal on error as well
      } finally {
        setIsLoadingUserId(false);
        SplashScreen.hideAsync();
      }
    };

    checkUserId();
  }, []);

  useEffect(() => {
    const fetchNotice = async () => {
      if (!userId) return;

      const netInfoState = await NetInfo.fetch();
      console.log('NetInfo State:', JSON.stringify(netInfoState)); // Detailed log
      if (!netInfoState.isConnected || netInfoState.isInternetReachable === false) { // Modified condition
        console.log(`No internet connection: isConnected: ${netInfoState.isConnected}, isInternetReachable: ${netInfoState.isInternetReachable}. Skipping notice check.`);
        return;
      }

      try {
        // 1. Get Current Notice
        const noticeResponse = await fetch(`${NOTICE_API_BASE_URL}/notice`);
        if (noticeResponse.status === 404) {
          console.log('No notice currently set.');
          return;
        }
        if (!noticeResponse.ok) {
          console.error('Failed to fetch notice:', noticeResponse.status);
          return;
        }
        const currentNotice: NoticeData & { target_user?: string, is_update?: boolean, timestamp?: string } = await noticeResponse.json();
        console.log('Current Notice Data:', JSON.stringify(currentNotice)); // Log notice data
        
        // For simplicity, we assume notice is for 'all' or matches target_user if specified
        // You might want to add more sophisticated target_user logic here

        // 2. Check if user has read the notice
        console.log('Fetching read status...'); // Log before fetching read status
        const showReadResponse = await fetch(`${NOTICE_API_BASE_URL}/showread`);
        if (!showReadResponse.ok) {
          console.error('Failed to fetch read status:', showReadResponse.status);
          // Decide if you want to show notice anyway or handle error differently
          setNoticeData(currentNotice);
          setShowNoticeModal(true);
          return;
        }
        const readData = await showReadResponse.json();
        console.log('Read Status Data:', JSON.stringify(readData)); // Log read status data
        const readUsers: string[] = readData.read_users || [];
        console.log('Read Users:', JSON.stringify(readUsers), 'Current UserID:', userId); // Log read users and current user ID

        if (!readUsers.includes(userId)) {
          console.log('User has not read the notice. Showing modal.'); // Log before showing modal
          setNoticeData(currentNotice);
          setShowNoticeModal(true);
        } else {
          console.log('User has already read the notice.');
        }

      } catch (error) {
        console.error('Error fetching notice or read status:', error);
      }
    };

    if (userId) {
      fetchNotice();
    }
  }, [userId]);

  const handleUserIdSet = (newUserId: string) => {
    setUserId(newUserId);
    setShowUsernameModal(false);
  };

  const handleCloseNotice = async () => {
    setShowNoticeModal(false);
    if (userId) {
      const netInfoState = await NetInfo.fetch();
      if (!netInfoState.isConnected || !netInfoState.isInternetReachable) {
        console.log('No internet connection, cannot mark notice as read.');
        return;
      }
      try {
        const response = await fetch(`${NOTICE_API_BASE_URL}/read?user=${encodeURIComponent(userId)}`, {
          method: 'POST',
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to mark notice as read:', response.status, errorData);
        } else {
          const successData = await response.json();
          console.log('Notice marked as read:', successData.message);
        }
      } catch (error) {
        console.error('Error marking notice as read:', error);
      }
    }
  };

  if (isLoadingUserId) {
    return null; // Or a loading spinner, but splash screen is active
  }

  return (
    <SafeAreaProvider>
      {userId ? (
        <AudioPlayerProvider>
          <StatusBar style="light" />
          <TabsLayout />
          {noticeData && (
            <NoticeModal
              visible={showNoticeModal}
              notice={noticeData}
              onClose={handleCloseNotice}
            />
          )}
        </AudioPlayerProvider>
      ) : (
        <UsernameInputModal
          visible={showUsernameModal}
          onClose={() => {
            // Potentially handle this differently, e.g., app closes or stays on modal
            // For now, if user closes without setting, they are stuck on modal screen
            setShowUsernameModal(true); 
          }}
          onUserIdSet={handleUserIdSet}
        />
      )}
    </SafeAreaProvider>
  );
}
