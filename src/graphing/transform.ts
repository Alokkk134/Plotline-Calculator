// World <-> CSS-pixel mapping for one frame.

export class Tf {
  readonly sx: number;
  readonly sy: number;
  constructor(
    readonly w: number,
    readonly h: number,
    readonly xmin: number,
    readonly xmax: number,
    readonly ymin: number,
    readonly ymax: number,
  ) {
    this.sx = w / (xmax - xmin);
    this.sy = h / (ymax - ymin);
  }
  px(x: number): number {
    return (x - this.xmin) * this.sx;
  }
  py(y: number): number {
    return (this.ymax - y) * this.sy;
  }
  x(px: number): number {
    return this.xmin + px / this.sx;
  }
  y(py: number): number {
    return this.ymax - py / this.sy;
  }
}
