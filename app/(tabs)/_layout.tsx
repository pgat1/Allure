import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { formatBadge, useBadgeCounts } from '@/app/lib/badgeCounts';

function TabIcon({ name, focused, badge }: { name: any; focused: boolean; badge?: string }) {
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
      <View>
        <Ionicons
          name={name}
          size={20}
          color={focused ? '#fff' : 'rgba(255,255,255,0.5)'}
        />
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const counts = useBadgeCounts();

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
            colors={['rgba(255,77,130,0.35)', 'rgba(255,77,130,0.35)']}
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
      <Tabs.Screen name="explore"  options={{ href: null }} />
      <Tabs.Screen
        name="likes"
        options={{
          title: "Allure'd",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'heart-circle' : 'heart-circle-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="likestab"
        options={{
          title: 'Likes',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'star' : 'star-outline'}
              focused={focused}
              badge={formatBadge(counts.likes)}
            />
          ),
        }}
      />
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
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              focused={focused}
              badge={formatBadge(counts.messages)}
            />
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
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff4d82',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
