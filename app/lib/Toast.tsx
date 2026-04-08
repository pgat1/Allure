import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

interface ToastProps {
  visible: boolean;
  icon: string;
  title: string;
  subtitle?: string;
  onHide: () => void;
}

function Toast({ visible, icon, title, subtitle, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onHide());
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { opacity }]}>
          <Text style={s.icon}>{icon}</Text>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.7)', alignItems:'center', justifyContent:'center' },
  card:     { backgroundColor:'#111', borderRadius:20, padding:24, alignItems:'center', gap:10, borderWidth:1, borderColor:'rgba(255,77,130,0.2)', minWidth:220, maxWidth:300 },
  icon:     { fontSize:40 },
  title:    { fontSize:16, fontWeight:'700', color:'#fff', textAlign:'center' },
  subtitle: { fontSize:13, color:'rgba(255,255,255,0.45)', textAlign:'center', lineHeight:18 },
});

interface ToastState {
  visible: boolean;
  icon: string;
  title: string;
  subtitle?: string;
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ visible: false, icon: '', title: '' });

  function showToast(icon: string, title: string, subtitle?: string) {
    setState({ visible: true, icon, title, subtitle });
  }

  function hideToast() {
    setState(prev => ({ ...prev, visible: false }));
  }

  const toastJSX = (
    <Toast
      visible={state.visible}
      icon={state.icon}
      title={state.title}
      subtitle={state.subtitle}
      onHide={hideToast}
    />
  );

  return { showToast, toastJSX };
}
