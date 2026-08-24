import '../setup';
import React from 'react';
import renderer from 'react-test-renderer';

// Mock useBusinessData
const mockRefetch = jest.fn();
jest.mock('~/hooks/use-business-data', () => ({
  useBusinessData: jest.fn(),
}));

// Mock haptics
jest.mock('~/lib/haptics', () => ({
  hapticImpact: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

import { useBusinessData } from '~/hooks/use-business-data';
import InvoicesScreen from '~/app/business/invoices';

const mockUseBusinessData = useBusinessData as jest.MockedFunction<typeof useBusinessData>;

describe('InvoicesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton when loading', () => {
    mockUseBusinessData.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<InvoicesScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    // Should render without crashing
    expect(tree.toJSON()).toBeTruthy();
  });

  it('shows empty state when no invoices', () => {
    mockUseBusinessData.mockReturnValue({
      data: { invoices: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<InvoicesScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const emptyTitle = texts.find((t) => t.props.children === 'No hay facturas aún');
    expect(emptyTitle).toBeTruthy();
  });

  it('renders invoices when data is available', () => {
    mockUseBusinessData.mockReturnValue({
      data: {
        invoices: [
          {
            id: '1',
            number: 'INV-2026-001',
            clientName: 'Test Client',
            total: 1000000,
            currency: 'COP',
            status: 'PAID',
            dueDate: null,
          },
          {
            id: '2',
            number: 'INV-2026-002',
            clientName: null,
            total: 500000,
            currency: 'COP',
            status: 'SENT',
            dueDate: '2026-09-01',
          },
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<InvoicesScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const labels = texts.map((t) => t.props.children);

    expect(labels).toContain('INV-2026-001');
    expect(labels).toContain('INV-2026-002');
    expect(labels).toContain('Test Client');
    expect(labels).toContain('Sin cliente');
  });

  it('renders the back button', () => {
    mockUseBusinessData.mockReturnValue({
      data: { invoices: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<InvoicesScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const backText = texts.find((t) => t.props.children === '← Volver');
    expect(backText).toBeTruthy();
  });
});
