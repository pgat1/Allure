import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

function Toast({ visible, message, onHide }: { visible: boolean; message: string; onHide: () => void }) {
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(-80);
    Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(translateY, { toValue: -80, duration: 260, useNativeDriver: true }).start(() => onHide());
    }, 2500);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[s.bar, { transform: [{ translateY }] }]}>
      <Text style={s.txt} numberOfLines={1}>{message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bar: { position:'absolute', top:54, left:20, right:20, backgroundColor:'#ff4d82', borderRadius:8, paddingHorizontal:18, paddingVertical:10, zIndex:999 },
  txt: { fontSize:13, color:'#fff', fontWeight:'600', textAlign:'center' },
});

export function useToast() {
  const [state, setState] = useState({ visible: false, message: '' });

  function showToast(message: string) {
    setState({ visible: true, message });
  }

  function hideToast() {
    setState(prev => ({ ...prev, visible: false }));
  }

  const toastJSX = (
    <Toast visible={state.visible} message={state.message} onHide={hideToast} />
  );

  return { showToast, toastJSX };
}
