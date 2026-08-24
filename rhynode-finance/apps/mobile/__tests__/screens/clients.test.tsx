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
import ClientsScreen from '~/app/business/clients';

const mockUseBusinessData = useBusinessData as jest.MockedFunction<typeof useBusinessData>;

describe('ClientsScreen', () => {
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
      tree = renderer.create(<ClientsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    expect(tree.toJSON()).toBeTruthy();
  });

  it('shows empty state when no clients', () => {
    mockUseBusinessData.mockReturnValue({
      data: { clients: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ClientsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const emptyTitle = texts.find((t) => t.props.children === 'No hay clientes aún');
    expect(emptyTitle).toBeTruthy();
  });

  it('renders clients when data is available', () => {
    mockUseBusinessData.mockReturnValue({
      data: {
        clients: [
          {
            id: '1',
            name: 'Acme Corp',
            email: 'contact@acme.com',
            phone: '+57 300 1234567',
          },
          {
            id: '2',
            name: 'Beta LLC',
            email: null,
            phone: null,
          },
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ClientsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const labels = texts.map((t) => t.props.children);

    expect(labels).toContain('Acme Corp');
    expect(labels).toContain('contact@acme.com');
    expect(labels).toContain('+57 300 1234567');
    expect(labels).toContain('Beta LLC');
  });

  it('renders the back button', () => {
    mockUseBusinessData.mockReturnValue({
      data: { clients: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ClientsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const backText = texts.find((t) => t.props.children === '← Volver');
    expect(backText).toBeTruthy();
  });
});
