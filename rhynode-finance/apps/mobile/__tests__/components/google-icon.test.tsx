import '../setup';
import renderer from 'react-test-renderer';
import { GoogleIcon } from '~/components/ui/google-icon';

describe('GoogleIcon', () => {
  it('renders SVG with default size', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<GoogleIcon />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = tree.toJSON();
    expect(json).toBeTruthy();
  });

  it('renders SVG with custom size', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<GoogleIcon size={32} />);
    });

    if (!tree) throw new Error('Tree not created');
    const root = tree.root;
    const svg = root.findByType('Svg');
    expect(svg.props.width).toBe(32);
    expect(svg.props.height).toBe(32);
  });

  it('contains Path elements for Google logo', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<GoogleIcon />);
    });

    if (!tree) throw new Error('Tree not created');
    const root = tree.root;
    const paths = root.findAllByType('Path');
    expect(paths.length).toBe(4); // Google logo has 4 path segments
  });
});
