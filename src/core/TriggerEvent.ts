export default class TriggerEvent {
  public readonly type: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public source: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(type: string, source: any) {
    this.type = type;
    this.source = source;
  }
}
