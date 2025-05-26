import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { DownloadedSong } from '../services/api';
import { deleteSong, getDownloadedSongs } from '../services/storage';

export default function LibraryScreen() {
  const { width } = useWindowDimensions();
  const [songs, setSongs] = useState<DownloadedSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { playSong, setPlaylist, currentSong, isPlaying } = useAudioPlayer();

  // Replace useEffect with useFocusEffect to refresh when navigating to this screen
  useFocusEffect(
    useCallback(() => {
      loadSongs();
    }, [])
  );

  const loadSongs = async () => {
    setIsLoading(true);
    try {
      const downloadedSongs = await getDownloadedSongs();
      setSongs(downloadedSongs);
      // Set the playlist for the audio player
      setPlaylist(downloadedSongs);
    } catch (error) {
      console.error('Error loading songs:', error);
      Alert.alert('Error', 'Failed to load downloaded songs');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySong = async (song: DownloadedSong) => {
    try {
      await playSong(song);
      router.push('/player');
    } catch (error) {
      console.error('Error playing song:', error);
      Alert.alert('Error', 'Failed to play song');
    }
  };

  const handleDeleteSong = async (song: DownloadedSong) => {
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${song.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSong(song.id);
              // Refresh the list
              loadSongs();
            } catch (error) {
              console.error('Error deleting song:', error);
              Alert.alert('Error', 'Failed to delete song');
            }
          },
        },
      ]
    );
  };

  const renderSongItem = ({ item, index }: { item: DownloadedSong; index: number }) => {
    const isCurrentSong = currentSong?.id === item.id;
    
    return (
      <Animated.View style={[styles.songItemWrapper, { opacity: 1 }]}>
        <TouchableOpacity 
          style={[styles.songItem, isCurrentSong && styles.currentSongItem]} 
          onPress={() => handlePlaySong(item)}
          activeOpacity={0.7}
        >
          <View style={styles.coverContainer}>
            <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
            {isCurrentSong && (
              <LinearGradient
                colors={['rgba(29, 185, 84, 0.8)', 'rgba(29, 185, 84, 0.3)']}
                style={styles.currentSongOverlay}
              />
            )}
            <View style={[styles.playIconOverlay, isCurrentSong && styles.currentPlayIcon]}>
              <Ionicons 
                name={isPlaying && isCurrentSong ? 'pause-circle' : 'play-circle'} 
                size={36} 
                color={isCurrentSong ? Colors.dark.primary : "rgba(255,255,255,0.9)"} 
              />
            </View>
          </View>
          <View style={styles.songInfo}>
            <Text style={[styles.songTitle, isCurrentSong && styles.currentSongTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.artistName, isCurrentSong && styles.currentArtistName]} numberOfLines={1}>
              {item.artist}
            </Text>
            <Text style={styles.albumName} numberOfLines={1}>{item.album}</Text>
            <View style={styles.metadataRow}>
              <View style={styles.downloadedIndicator}>
                <Ionicons name="cloud-done-outline" size={14} color={Colors.dark.primary} />
                <Text style={styles.downloadedText}>Downloaded</Text>
              </View>
              {isCurrentSong && (
                <View style={styles.nowPlayingIndicator}>
                  <View style={styles.soundWave}>
                    <View style={[styles.bar, styles.bar1]} />
                    <View style={[styles.bar, styles.bar2]} />
                    <View style={[styles.bar, styles.bar3]} />
                  </View>
                  <Text style={styles.nowPlayingText}>Now Playing</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => handleDeleteSong(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={24} color={Colors.dark.error} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient
        colors={[Colors.dark.background, '#0A0A0A']}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="library-outline" size={28} color={Colors.dark.primary} />
              <Text style={styles.headerTitle}>My Library</Text>
            </View>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>{songs.length} songs</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.loadingContainer}>
              <Ionicons name="musical-notes-outline" size={48} color={Colors.dark.primary} />
              <Text style={styles.loadingText}>Loading your music...</Text>
            </View>
          </View>
        ) : songs.length > 0 ? (
          <FlatList
            data={songs}
            renderItem={renderSongItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyStateContainer}>
              <LinearGradient
                colors={[Colors.dark.primary + '20', Colors.dark.primary + '05']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="cloud-download-outline" size={64} color={Colors.dark.primary} />
              </LinearGradient>
              <Text style={styles.emptyText}>
                Your library is empty
              </Text>
              <Text style={styles.emptySubText}>
                Search and download songs to build your offline collection
              </Text>
              <TouchableOpacity style={styles.exploreButton} onPress={() => router.push('/search')}>
                <Ionicons name="search-outline" size={20} color={Colors.dark.background} />
                <Text style={styles.exploreButtonText}>Explore Music</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '30',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark.text,
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  statsContainer: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statsText: {
    fontSize: 12,
    color: Colors.dark.subText,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  separator: {
    height: 8,
  },
  songItemWrapper: {
    marginBottom: 4,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border + '40',
  },
  currentSongItem: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.primary + '60',
    borderWidth: 2,
    elevation: 6,
    shadowOpacity: 0.25,
  },
  coverContainer: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  currentSongOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  currentPlayIcon: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  songInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  currentSongTitle: {
    color: Colors.dark.primary,
  },
  artistName: {
    fontSize: 15,
    color: Colors.dark.subText,
    marginBottom: 3,
    fontWeight: '500',
  },
  currentArtistName: {
    color: Colors.dark.primary + 'CC',
  },
  albumName: {
    fontSize: 13,
    color: Colors.dark.subText + 'AA',
    marginBottom: 8,
    fontWeight: '400',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  downloadedText: {
    fontSize: 11,
    color: Colors.dark.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  nowPlayingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soundWave: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  bar: {
    width: 2,
    backgroundColor: Colors.dark.primary,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  bar1: {
    height: 8,
  },
  bar2: {
    height: 12,
  },
  bar3: {
    height: 6,
  },
  nowPlayingText: {
    fontSize: 10,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.error + '15',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.subText,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySubText: {
    fontSize: 16,
    color: Colors.dark.subText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 4,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
    marginLeft: 8,
  },
});