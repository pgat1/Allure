import { supabase } from '@/app/lib/supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase.from('profiles').update({ push_token: token }).eq('id', userData.user.id);
  }

  return token;
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function sendMatchNotification(name: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "It's a Match! 💞",
      body: `You and ${name} liked each other!`,
      sound: true,
    },
    trigger: null,
  });
}

export async function sendMessageNotification(name: string, message: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: name,
      body: message,
      sound: true,
    },
    trigger: null,
  });
}

export async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  const { data: profile } = await supabase.from('profiles').select('push_token').eq('id', userId).single();
  if (!profile?.push_token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: profile.push_token, title, body, sound: 'default' }),
  });
}
