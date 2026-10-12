import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FREE_HABIT_LIMIT, useStore } from './src/store/useStore';
import { THEMES, colors } from './src/theme';
import { startCloudSync } from './src/lib/firebase';
import { useToday } from './src/lib/useToday';
import { Onboarding } from './src/screens/Onboarding';
import { Home } from './src/screens/Home';
import { Dashboard } from './src/screens/Dashboard';
import { Paywall } from './src/screens/Paywall';

export default function App() {
  const { habits, activeId, isPro, theme, hydrated, addHabit, logToday, setPro, setTheme } = useStore();
  const [tab, setTab] = useState<'home' | 'stats'>('home');
  const [paywall, setPaywall] = useState(false);
  const [adding, setAdding] = useState(false);

  const today = useToday();

  // Start syncing only after local data is loaded, so cloud can never race ahead of the device.
  useEffect(() => (hydrated ? startCloudSync() : undefined), [hydrated]);

  // Android back should leave the "add habit" screen, not the app.
  useEffect(() => {
    if (!adding) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (setAdding(false), true));
    return () => sub.remove();
  }, [adding]);

  // A theme that was Pro-only falls back if Pro is somehow not active.
  const t = THEMES[THEMES[theme].pro && !isPro ? 'volt' : theme];
  const habit = habits.find((h) => h.id === activeId) ?? habits[0];

  const onAdd = () => (!isPro && habits.length >= FREE_HABIT_LIMIT ? setPaywall(true) : setAdding(true));

  if (!hydrated) {
    return (
      <View style={[styles.root, styles.loading]}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {!habit || adding ? (
          <Onboarding
            accent={t.accent}
            onCancel={habit ? () => setAdding(false) : undefined}
            onSubmit={(name) => {
              addHabit(name);
              setAdding(false);
              setTab('home');
            }}
          />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              {tab === 'home' ? (
                <Home habit={habit} accent={t.accent} accent2={t.accent2} today={today} onLog={() => logToday(habit.id)} onAdd={onAdd} />
              ) : (
                <Dashboard
                  habit={habit}
                  accent={t.accent}
                  today={today}
                  isPro={isPro}
                  theme={theme}
                  onTheme={setTheme}
                  onUpsell={() => setPaywall(true)}
                />
              )}
            </View>
            <View style={styles.tabs}>
              {(['home', 'stats'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === k }}
                  style={styles.tab}
                >
                  <Text style={[styles.tabT, tab === k && { color: t.accent }]}>{k === 'home' ? 'STREAK' : 'INSIGHTS'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <Modal visible={paywall} animationType="slide" onRequestClose={() => setPaywall(false)}>
          <SafeAreaView style={styles.root}>
            <Paywall
              accent={t.accent}
              onClose={() => setPaywall(false)}
              onUnlocked={() => {
                setPro(true);
                setPaywall(false);
              }}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  tabT: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
});
