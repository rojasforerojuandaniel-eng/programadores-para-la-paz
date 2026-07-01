import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Shield } from 'lucide-react-native';
import { colors } from '~/theme/colors';

interface MfaCodeInputProps extends Pick<TextInputProps, 'value' | 'onChangeText' | 'onSubmitEditing' | 'editable' | 'maxLength' | 'autoFocus'> {
  accessibilityLabel?: string;
  placeholder?: string;
  isBackupCode?: boolean;
}

const COLORS = {
  background: '#0d0e13',
  foreground: '#fafafa',
  muted: '#9ca3af',
  primary: colors.primary,
  border: '#26272b',
};

export function MfaCodeInput({
  value,
  onChangeText,
  onSubmitEditing,
  editable = true,
  maxLength = 6,
  autoFocus = false,
  accessibilityLabel = 'Código TOTP',
  placeholder = '000000',
  isBackupCode = false,
}: MfaCodeInputProps) {
  return (
    <View style={styles.inputWrap}>
      <Shield color={COLORS.muted} size={20} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={isBackupCode ? 'Código de respaldo' : placeholder}
        placeholderTextColor={COLORS.muted}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={maxLength}
        editable={editable}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={isBackupCode ? 'Ingresa un código de respaldo' : 'Ingresa el código de 6 dígitos de tu autenticador'}
        textContentType="oneTimeCode"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    color: COLORS.foreground,
    paddingHorizontal: 16,
    paddingLeft: 48,
    fontSize: 18,
    letterSpacing: 4,
  },
});
