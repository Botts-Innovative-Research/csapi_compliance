import { describe, it, expect, vi } from 'vitest';
import { CancelTokenImpl, createCancelToken } from '@/engine/cancel-token';

describe('CancelTokenImpl', () => {
  it('should start with cancelled = false', () => {
    const token = new CancelTokenImpl();
    expect(token.cancelled).toBe(false);
  });

  it('should set cancelled to true when cancel() is called', () => {
    const token = new CancelTokenImpl();
    token.cancel();
    expect(token.cancelled).toBe(true);
  });

  it('should call onCancel listener when cancel() is invoked', () => {
    const token = new CancelTokenImpl();
    const listener = vi.fn();
    token.onCancel(listener);
    token.cancel();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('should call multiple onCancel listeners', () => {
    const token = new CancelTokenImpl();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    token.onCancel(listener1);
    token.onCancel(listener2);
    token.onCancel(listener3);

    token.cancel();

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
    expect(listener3).toHaveBeenCalledOnce();
  });

  it('should not call listeners registered after cancel()', () => {
    const token = new CancelTokenImpl();
    token.cancel();

    const lateListener = vi.fn();
    token.onCancel(lateListener);

    // The late listener should NOT have been called because cancel() already fired
    expect(lateListener).not.toHaveBeenCalled();
  });

  it('should only invoke listeners once even if cancel() is called twice', () => {
    const token = new CancelTokenImpl();
    const listener = vi.fn();
    token.onCancel(listener);

    token.cancel();
    token.cancel();

    expect(listener).toHaveBeenCalledOnce();
    expect(token.cancelled).toBe(true);
  });
});

describe('createCancelToken', () => {
  it('should return a CancelToken instance', () => {
    const token = createCancelToken();
    expect(token.cancelled).toBe(false);
    expect(typeof token.onCancel).toBe('function');
    expect(typeof token.cancel).toBe('function');
  });

  it('should create independent tokens', () => {
    const token1 = createCancelToken();
    const token2 = createCancelToken();

    token1.cancel();

    expect(token1.cancelled).toBe(true);
    expect(token2.cancelled).toBe(false);
  });
});
