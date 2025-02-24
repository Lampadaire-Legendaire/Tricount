import { View, StyleSheet, StatusBar, SafeAreaView, Platform } from 'react-native';
import { ReactNode } from 'react';

interface ScreenWrapperProps {
  children: ReactNode;
}

export default function ScreenWrapper({ children }: ScreenWrapperProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight,
      },
    }),
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 