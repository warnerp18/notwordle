import { act, renderHook } from '@testing-library/react';
import useDelayedLoading from './useDelayedLoading';
import { SHOW_DELAY, MIN_VISIBLE } from '@/app/lib/constants';

// fake timers: tests move the clock forward instead of waiting
const advance = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

const renderLoading = () =>
  renderHook(({ isFetching }) => useDelayedLoading(isFetching), {
    initialProps: { isFetching: false },
  });

describe('useDelayedLoading', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts hidden', () => {
    const { result } = renderLoading();

    expect(result.current.showLoading).toBe(false);
  });

  it('never shows for a request that finishes before the delay', () => {
    const { result, rerender } = renderLoading();

    rerender({ isFetching: true });
    advance(SHOW_DELAY - 1);
    rerender({ isFetching: false });
    advance(MIN_VISIBLE * 2);

    expect(result.current.showLoading).toBe(false);
  });

  it('shows once the delay has passed', () => {
    const { result, rerender } = renderLoading();

    rerender({ isFetching: true });
    advance(SHOW_DELAY - 1);
    expect(result.current.showLoading).toBe(false);

    advance(1);
    expect(result.current.showLoading).toBe(true);
  });

  it('stays visible for the minimum time when the request finishes soon after showing', () => {
    const { result, rerender } = renderLoading();

    rerender({ isFetching: true });
    advance(SHOW_DELAY + 100);
    rerender({ isFetching: false });

    // shown for 100ms so far, so it should stay for the rest of MIN_VISIBLE
    advance(MIN_VISIBLE - 100 - 1);
    expect(result.current.showLoading).toBe(true);

    advance(1);
    expect(result.current.showLoading).toBe(false);
  });

  it('hides straight away when it has already been visible long enough', () => {
    const { result, rerender } = renderLoading();

    rerender({ isFetching: true });
    advance(SHOW_DELAY + MIN_VISIBLE + 500);
    expect(result.current.showLoading).toBe(true);

    rerender({ isFetching: false });
    expect(result.current.showLoading).toBe(false);
  });

  it('stays on without flickering when a new request starts during the minimum time', () => {
    const { result, rerender } = renderLoading();

    rerender({ isFetching: true });
    advance(SHOW_DELAY + 100);
    rerender({ isFetching: false });
    advance(100);

    // second guess arrives while the first one's minimum time is still running
    rerender({ isFetching: true });
    advance(MIN_VISIBLE);
    expect(result.current.showLoading).toBe(true);
  });

  it('cancels its timers when unmounted', () => {
    const { rerender, unmount } = renderLoading();

    rerender({ isFetching: true });
    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
