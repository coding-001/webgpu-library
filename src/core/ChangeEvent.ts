import TriggerEvent from './TriggerEvent';

export default class ChangeEvent extends TriggerEvent {
  public readonly property?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly oldValue?: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly newValue?: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(source: any, property: string, oldValue: any = null, newValue: any = null) {
    super('change', source);
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
}
