import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('react-native', () => {
  const React = jest.requireActual('react');
  const mockComponent = (name: string) => {
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(name, { ref, ...props })
    );
    Comp.displayName = name;
    return Comp;
  };

  return {
    __esModule: true,
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    Pressable: mockComponent('Pressable'),
    TextInput: mockComponent('TextInput'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    Alert: { alert: jest.fn() },
    Share: { share: jest.fn() },
    Platform: { OS: 'ios' },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...styles),
    },
  };
});

jest.mock('nativewind', () => ({
  cssInterop: (Component: React.ComponentType) => Component,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  SplashScreen: {
    preventAutoHideAsync: jest.fn(),
    hideAsync: jest.fn(),
  },
}));

jest.mock('~/hooks/use-transaction', () => ({
  useTransaction: jest.fn(),
  useDeleteTransaction: jest.fn(),
}));

jest.mock('~/hooks/use-toast', () => ({
  showToast: jest.fn(),
}));

jest.mock('@rhynode/shared', () => ({
  formatCurrency: (amount: number, currency: string) => `${currency} ${amount}`,
  formatDate: (date: string) => `DATE:${date}`,
}));

jest.mock('~/components/features/transaction-actions', () => ({
  TransactionActions: ({
    onEdit,
    onDelete,
    onShare,
    disabled,
  }: {
    onEdit: () => void;
    onDelete: () => void;
    onShare: () => void;
    disabled?: boolean;
  }) => {
    const React = jest.requireActual('react');
    return React.createElement(
      'View',
      { testID: 'transaction-actions' },
      React.createElement('Pressable', { testID: 'edit-button', onPress: onEdit, disabled }, null),
      React.createElement('Pressable', { testID: 'delete-button', onPress: onDelete, disabled }, null),
      React.createElement('Pressable', { testID: 'share-button', onPress: onShare, disabled }, null)
    );
  },
}));

import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert, Share } from 'react-native';
import { useDeleteTransaction, useTransaction } from '~/hooks/use-transaction';
import { showToast } from '~/hooks/use-toast';
import TransactionDetailScreen from '../../../app/transaction/[id]';

const mockTransaction = {
  id: 'txn-123',
  type: 'EXPENSE' as const,
  category: 'Comida',
  description: 'Almuerzo de trabajo',
  amount: 25000,
  currency: 'COP',
  date: '2026-06-30T12:00:00.000Z',
  accountName: 'Efectivo',
  bankAccountName: null,
  organizationName: 'Mi Empresa',
};

function findByTestID(instance: renderer.ReactTestInstance, testID: string) {
  return instance.find((node) => node.props.testID === testID);
}

function findByTypeAndText(instance: renderer.ReactTestInstance, type: string, text: string) {
  return instance.find(
    (node) => node.type === type && node.props.children === text
  );
}

function findByTypeAndTextContaining(instance: renderer.ReactTestInstance, type: string, text: string) {
  return instance.find((node) => node.type === type && String(node.props.children).includes(text));
}

describe('TransactionDetailScreen', () => {
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  };
  const mockRefetch = jest.fn();
  const mockDeleteMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'txn-123' });
    (useDeleteTransaction as jest.Mock).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
  });

  it('renders a loading state', () => {
    (useTransaction as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    expect(findByTypeAndText(tree.root, 'Text', 'Cargando movimiento...')).toBeTruthy();
    expect(() => findByTestID(tree.root, 'transaction-actions')).toThrow();
  });

  it('renders not found state when the API returns 404', () => {
    (useTransaction as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API 404: Not Found'),
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    expect(findByTypeAndText(tree.root, 'Text', 'Movimiento no encontrado')).toBeTruthy();

    const backButton = findByTestID(tree.root, 'not-found-back');
    renderer.act(() => {
      backButton.props.onPress();
    });

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('renders an error state with retry', () => {
    (useTransaction as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API 500: Internal Server Error'),
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    expect(findByTypeAndText(tree.root, 'Text', 'API 500: Internal Server Error')).toBeTruthy();

    const retryButton = findByTestID(tree.root, 'retry-button');
    renderer.act(() => {
      retryButton.props.onPress();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders transaction details and exposes actions', () => {
    (useTransaction as jest.Mock).mockReturnValue({
      data: mockTransaction,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    expect(findByTypeAndText(tree.root, 'Text', 'Almuerzo de trabajo')).toBeTruthy();
    expect(findByTypeAndText(tree.root, 'Text', 'Comida')).toBeTruthy();
    expect(findByTypeAndTextContaining(tree.root, 'Text', 'COP 25000')).toBeTruthy();
    expect(findByTypeAndText(tree.root, 'Text', 'Gasto')).toBeTruthy();
    expect(findByTypeAndText(tree.root, 'Text', 'Cuenta')).toBeTruthy();
    expect(findByTypeAndText(tree.root, 'Text', 'Efectivo')).toBeTruthy();
    expect(findByTestID(tree.root, 'transaction-actions')).toBeTruthy();
  });

  it('navigates to the pre-filled edit form', () => {
    (useTransaction as jest.Mock).mockReturnValue({
      data: mockTransaction,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const editButton = findByTestID(tree.root, 'edit-button');
    renderer.act(() => {
      editButton.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(tabs)/add',
      params: {
        transactionId: 'txn-123',
        merchant: 'Almuerzo de trabajo',
        total: '25000',
        date: '2026-06-30T12:00:00.000Z',
        type: 'EXPENSE',
        category: 'Comida',
        currency: 'COP',
      },
    });
  });

  it('shares the transaction', async () => {
    (Share.share as jest.Mock).mockResolvedValue({ action: 'shared' });

    (useTransaction as jest.Mock).mockReturnValue({
      data: mockTransaction,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const shareButton = findByTestID(tree.root, 'share-button');
    await renderer.act(async () => {
      shareButton.props.onPress();
    });

    expect(Share.share).toHaveBeenCalledWith({
      message: 'Gasto: COP 25000 - Almuerzo de trabajo (DATE:2026-06-30T12:00:00.000Z)',
    });
  });

  it('shows a confirmation alert before deleting', () => {
    (useTransaction as jest.Mock).mockReturnValue({
      data: mockTransaction,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const deleteButton = findByTestID(tree.root, 'delete-button');
    renderer.act(() => {
      deleteButton.props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Eliminar movimiento',
      '¿Seguro que quieres eliminar "Almuerzo de trabajo"? Esta acción no se puede deshacer.',
      expect.any(Array)
    );
  });

  it('deletes the transaction and goes back on confirmation', () => {
    (useTransaction as jest.Mock).mockReturnValue({
      data: mockTransaction,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TransactionDetailScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const deleteButton = findByTestID(tree.root, 'delete-button');
    renderer.act(() => {
      deleteButton.props.onPress();
    });

    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertArgs[2] as Array<{ text: string; style?: string; onPress?: () => void }>;
    const destructiveButton = buttons.find((button) => button.style === 'destructive');

    if (!destructiveButton?.onPress) {
      throw new Error('Destructive delete button not found');
    }

    renderer.act(() => {
      destructiveButton.onPress();
    });

    expect(mockDeleteMutate).toHaveBeenCalledWith('txn-123', expect.any(Object));

    const { onSuccess } = mockDeleteMutate.mock.calls[0][1] as { onSuccess: () => void };
    renderer.act(() => {
      onSuccess();
    });

    expect(showToast).toHaveBeenCalledWith('Movimiento eliminado', 'success');
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
