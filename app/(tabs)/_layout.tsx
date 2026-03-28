import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Animated, StyleSheet } from 'react-native';

function TabIcon({ name, focused }: { name: any, focused: boolean }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.25 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons
        name={name}
        size={20}
        color={focused ? '#fff' : 'rgba(255,255,255,0.5)'}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          <LinearGradient
            colors={['#ff4d82', '#ff4d82']}
            start={{ x:0, y:0 }}
            end={{ x:0, y:1 }}
            style={[StyleSheet.absoluteFillObject, styles.gradientBg]}
          />
        ),
      }}
    >
      <Tabs.Screen name="index"    options={{ href: null }} />
      <Tabs.Screen name="auth"     options={{ href: null }} />
      <Tabs.Screen name="facescan" options={{ href: null }} />
      <Tabs.Screen
        name="swipe"
        options={{
          title: 'Match',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'flame' : 'flame-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubble' : 'chatbubble-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 62,
    paddingBottom: 14,
    paddingTop: 6,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 30,
    position: 'absolute',
    elevation: 0,
    shadowColor: '#ff4d82',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  gradientBg: {
    borderRadius: 30,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
});
