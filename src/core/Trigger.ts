import ChangeEvent from './ChangeEvent';
import TriggerEvent from './TriggerEvent';

interface TriggerListener<S> {
  (evt: TriggerEvent<S>): void;
}

interface TriggerListenerBundle<S> {
  callback: TriggerListener<S>;
  scope?: unknown;
}

export default class Trigger<S> {
  private listenerMap: Map<string, TriggerListenerBundle<S>[]> = new Map();

  protected source: S;

  public on(type: string, callback: TriggerListener<S>, scope?: unknown): void {
    const listeners = this.listenerMap.get(type);
    const bundle = { callback, scope };
    if (listeners) {
      const added = listeners.some(
        (listener) => listener.callback === callback && listener.scope === scope,
      );
      if (!added) {
        listeners.push(bundle);
      }
    } else {
      this.listenerMap.set(type, [bundle]);
    }
  }

  public off(type: string, callback: TriggerListener<S>): void {
    const listeners = this.listenerMap.get(type);
    if (listeners) {
      const index = listeners.findIndex((listener) => listener.callback === callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  public fire(event: TriggerEvent<S>): void {
    const listeners = this.listenerMap.get(event.type);
    if (listeners && listeners.length) {
      listeners.forEach((listener) => {
        listener.callback.call(listener.scope, event);
      });
    }
  }

  public firePropertyChanged<V>(property: string, oldValue?: V, newValue?: V): void {
    this.fire(new ChangeEvent(this.source, property, oldValue, newValue));
  }
}
