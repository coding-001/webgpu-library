import ChangeEvent from './ChangeEvent';
import TriggerEvent from './TriggerEvent';

interface TriggerListener {
  (evt: TriggerEvent): void;
  scope?: object;
}

interface TriggerListenerBundle {
  callback: TriggerListener;
  scope: object;
}

export default class Trigger {
  private listenerMap: Map<string, TriggerListenerBundle[]> = new Map();

  public on(type: string, callback: TriggerListener, scope?: object): void {
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

  public off(type: string, callback: TriggerListener): void {
    const listeners = this.listenerMap.get(type);
    if (listeners) {
      const index = listeners.findIndex((listener) => listener.callback === callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  public fire(event: TriggerEvent): void {
    const listeners = this.listenerMap.get(event.type);
    if (listeners && listeners.length) {
      listeners.forEach((listener) => {
        listener.callback.call(listener.scope, event);
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public firePropertyChanged(property: string, oldValue: any = null, newValue: any = null): void {
    this.fire(new ChangeEvent(this, property, oldValue, newValue));
  }
}
