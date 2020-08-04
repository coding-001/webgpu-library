export default class TriggerEvent<S> {
  public readonly type: string;

  public source: S;

  public constructor(type: string, source: S) {
    this.type = type;
    this.source = source;
  }
}
