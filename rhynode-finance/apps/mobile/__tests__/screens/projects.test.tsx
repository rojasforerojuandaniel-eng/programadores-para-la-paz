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

// Mock formatCurrency
jest.mock('@rhynode/shared', () => ({
  formatCurrency: (value: number) => `$${value.toLocaleString()}`,
  formatDate: (date: string) => date,
}));

import { useBusinessData } from '~/hooks/use-business-data';
import ProjectsScreen from '~/app/business/projects';

const mockUseBusinessData = useBusinessData as jest.MockedFunction<typeof useBusinessData>;

describe('ProjectsScreen', () => {
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
      tree = renderer.create(<ProjectsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    expect(tree.toJSON()).toBeTruthy();
  });

  it('shows empty state when no projects', () => {
    mockUseBusinessData.mockReturnValue({
      data: { projects: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ProjectsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const emptyTitle = texts.find((t) => t.props.children === 'No hay proyectos aún');
    expect(emptyTitle).toBeTruthy();
  });

  it('renders projects when data is available', () => {
    mockUseBusinessData.mockReturnValue({
      data: {
        projects: [
          {
            id: '1',
            name: 'Website Redesign',
            budget: 5000000,
            currency: 'COP',
            status: 'ACTIVE',
          },
          {
            id: '2',
            name: 'Mobile App',
            budget: null,
            currency: 'COP',
            status: 'PLANNING',
          },
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ProjectsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const labels = texts.map((t) => t.props.children);

    expect(labels).toContain('Website Redesign');
    expect(labels).toContain('Mobile App');
    expect(labels).toContain('active'); // lowercase status
    expect(labels).toContain('planning'); // lowercase status
  });

  it('renders the back button', () => {
    mockUseBusinessData.mockReturnValue({
      data: { projects: [] },
      isLoading: false,
      refetch: mockRefetch,
    } as never);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ProjectsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const texts = tree.root.findAllByType('Text');
    const backText = texts.find((t) => t.props.children === '← Volver');
    expect(backText).toBeTruthy();
  });
});
