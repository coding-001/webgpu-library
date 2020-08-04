import TriggerEvent from './TriggerEvent';

export default class ChangeEvent<S, V> extends TriggerEvent<S> {
  public readonly property?: string;

  public readonly oldValue?: V;

  public readonly newValue?: V;

  public constructor(source: S, property: string, oldValue?: V, newValue?: V) {
    super('change', source);
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
}
