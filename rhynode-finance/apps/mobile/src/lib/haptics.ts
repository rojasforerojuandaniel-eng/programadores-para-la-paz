import * as Haptics from 'expo-haptics';

export type ImpactStyle = Haptics.ImpactFeedbackStyle;
export type NotificationType = Haptics.NotificationFeedbackType;

export async function hapticImpact(style: ImpactStyle = Haptics.ImpactFeedbackStyle.Light) {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Swallow haptic failures so UI never breaks.
  }
}

export async function hapticNotification(
  type: NotificationType = Haptics.NotificationFeedbackType.Success
) {
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // Swallow haptic failures so UI never breaks.
  }
}
