import { showToast, hideToast, useToast } from '~/hooks/use-toast';

describe('useToast', () => {
  afterEach(() => {
    useToast.setState({ toasts: [], queue: [] });
  });

  it('shows a toast in the visible list', () => {
    showToast('First toast', 'info');

    const state = useToast.getState();
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].message).toBe('First toast');
    expect(state.toasts[0].type).toBe('info');
    expect(state.queue).toHaveLength(0);
  });

  it('keeps up to three toasts visible', () => {
    showToast('One', 'info');
    showToast('Two', 'success');
    showToast('Three', 'error');

    const state = useToast.getState();
    expect(state.toasts).toHaveLength(3);
    expect(state.queue).toHaveLength(0);
  });

  it('queues toasts beyond the visible limit', () => {
    showToast('One', 'info');
    showToast('Two', 'success');
    showToast('Three', 'error');
    showToast('Four', 'info');
    showToast('Five', 'success');

    const state = useToast.getState();
    expect(state.toasts).toHaveLength(3);
    expect(state.queue).toHaveLength(2);
    expect(state.queue[0].message).toBe('Four');
    expect(state.queue[1].message).toBe('Five');
  });

  it('promotes queued toasts when a visible toast is dismissed', () => {
    showToast('One', 'info');
    showToast('Two', 'success');
    showToast('Three', 'error');
    showToast('Four', 'info');

    const firstId = useToast.getState().toasts[0].id;

    useToast.getState().dismiss(firstId);

    const state = useToast.getState();
    expect(state.toasts).toHaveLength(3);
    expect(state.toasts.map((toast) => toast.message)).toEqual([
      'Two',
      'Three',
      'Four',
    ]);
    expect(state.queue).toHaveLength(0);
  });

  it('dismisses a queued toast without promoting', () => {
    showToast('One', 'info');
    showToast('Two', 'success');
    showToast('Three', 'error');
    showToast('Four', 'info');

    const queuedId = useToast.getState().queue[0].id;

    useToast.getState().dismiss(queuedId);

    const state = useToast.getState();
    expect(state.toasts).toHaveLength(3);
    expect(state.queue).toHaveLength(0);
  });

  it('hideToast alias dismisses a toast', () => {
    showToast('One', 'info');
    const id = useToast.getState().toasts[0].id;

    hideToast(id);

    const state = useToast.getState();
    expect(state.toasts).toHaveLength(0);
    expect(state.queue).toHaveLength(0);
  });

  it('assigns unique ids to each toast', () => {
    showToast('One', 'info');
    showToast('Two', 'info');

    const ids = useToast.getState().toasts.map((toast) => toast.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
