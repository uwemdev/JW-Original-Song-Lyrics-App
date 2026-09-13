import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  Animated,
  FlatList,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Welcome to Original Song Lyrics',
    body: 'Every original song from jw.org, gathered in one place. Read the lyrics, learn the story behind each song, and listen along whenever you\'re connected.',
  },
  {
    id: '2',
    title: 'Lyrics for every song, always at hand',
    body: 'Browse Original Songs, Become Jehovah\'s Friend, Sing With Us, and International Music. Each song comes with its lyrics and a short write-up so you understand the heart behind it, not just the words.',
  },
  {
    id: '3',
    title: 'Sing along, online or off',
    body: 'Connected to Wi-Fi or data? The song plays automatically as you read. No connection? The lyrics are still right there. Save your favorites so they\'re always one tap away.',
  }
];

export default function OnboardingScreen({ navigation }) {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (hasLaunched === null) {
          setIsFirstLaunch(true);
          await AsyncStorage.setItem('hasLaunched', 'true');
        } else {
          navigation.replace('MainApp');
        }
      } catch (error) {
        setIsFirstLaunch(true);
      }
    }
    
    checkFirstLaunch();
  }, [navigation]);

  if (isFirstLaunch === null) {
    return <View style={styles.container} />;
  }

  const handleContinue = () => {
    navigation.replace('MainApp');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Background Opacity Interpolation for crossfading
  // Screen 1: bg1 visible (opacity 1), bg2 invisible (opacity 0)
  // Screen 2 & 3: bg2 visible (opacity 1)
  const bg2Opacity = scrollX.interpolate({
    inputRange: [0, width, width * 2],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  // Darker gradient overlay on Screen 3
  const extraDarkOpacity = scrollX.interpolate({
    inputRange: [0, width, width * 2],
    outputRange: [0, 0, 0.6],
    extrapolate: 'clamp',
  });

  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Animated Backgrounds */}
      <Animated.Image 
        source={require('../../assets/onboarding_bg_1.jpg')} 
        style={[styles.backgroundImage, { position: 'absolute' }]}
        resizeMode="cover"
      />
      <Animated.Image 
        source={require('../../assets/onboarding_bg_2.jpg')} 
        style={[styles.backgroundImage, { position: 'absolute', opacity: bg2Opacity }]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={['rgba(3, 7, 18, 0.1)', 'rgba(23, 12, 38, 0.7)', '#030712']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: extraDarkOpacity }]} />
        
        <SafeAreaView style={styles.safeArea}>
          
          <Animated.FlatList 
            ref={flatListRef}
            data={slides}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            bounces={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false } // Opacity interpolation doesn't always support true on Android for complex background logic, but color/opacity often does. Wait, using useNativeDriver: false for width/layout animations.
            )}
            onViewableItemsChanged={viewableItemsChanged}
            viewabilityConfig={viewConfig}
            scrollEventThrottle={32}
            contentContainerStyle={styles.flatListContent}
          />

          {/* Bottom Controls */}
          <View style={styles.controlsContainer}>
            
            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {slides.map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                
                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 24, 8],
                  extrapolate: 'clamp',
                });
                
                const dotOpacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View 
                    key={i.toString()} 
                    style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]} 
                  />
                );
              })}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {currentIndex === slides.length - 1 ? (
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleContinue}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.navButtonsRow}>
                  <TouchableOpacity 
                    style={styles.textButton}
                    onPress={handleContinue}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.skipText}>Skip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.button, styles.nextButton]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
          
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  backgroundImage: {
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  flatListContent: {
    paddingTop: height * 0.45, // Push text to lower half
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  textContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    color: '#D1D5DB', // Light gray
    fontWeight: '400',
    lineHeight: 26,
    opacity: 0.95,
  },
  controlsContainer: {
    height: 160,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 30,
  },
  pagination: {
    flexDirection: 'row',
    height: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A78BFA',
    marginRight: 8,
  },
  buttonContainer: {
    height: 60,
    justifyContent: 'center',
  },
  navButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    width: '100%',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textButton: {
    paddingVertical: 15,
    paddingRight: 20,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 17,
    fontWeight: '600',
  },
});
