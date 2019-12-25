export default class KeyDefine {
  public readonly name: string;

  public value: number;

  public constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }

  toString(): string {
    return `${this.name}:${this.value}`;
  }
}
