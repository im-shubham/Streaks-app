import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { colors } from '../theme';

export function Onboarding({
  accent,
  onSubmit,
  onCancel,
}: {
  accent: string;
  onSubmit: (name: string) => void;
  onCancel?: () => void; // only when adding a 2nd+ habit; first-run has nowhere to go back to
}) {
  const [name, setName] = useState('');
  const ok = name.trim().length > 0;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <Text style={styles.q}>What are we{'\n'}tracking?</Text>
      <TextInput
        accessibilityLabel="Habit name"
        autoFocus
        value={name}
        onChangeText={setName}
        placeholder="Daily Code"
        placeholderTextColor={colors.dim}
        maxLength={28}
        style={[styles.input, { borderColor: ok ? accent : colors.dim }]}
        onSubmitEditing={() => ok && onSubmit(name)}
        returnKeyType="go"
      />
      {onCancel && (
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancel}>
          <Text style={styles.cancelT}>Cancel</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={!ok}
        onPress={() => onSubmit(name)}
        style={[styles.btn, { backgroundColor: ok ? accent : colors.dim }]}
      >
        <Text style={styles.btnText}>Start</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 28, gap: 28 },
  q: { color: colors.text, fontSize: 44, fontWeight: '900', lineHeight: 50 },
  input: { color: colors.text, fontSize: 26, fontWeight: '700', borderBottomWidth: 2, paddingVertical: 10 },
  cancel: { alignSelf: 'flex-start' },
  cancelT: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});
