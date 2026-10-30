// Lightweight Pure TypeScript QR Code Matrix Generator (Zero external dependencies)
class QRMath {
  static EXP_TABLE = new Array(256);
  static LOG_TABLE = new Array(256);
  static initialized = false;

  static init() {
    if (QRMath.initialized) return;
    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) {
      QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
    }
    QRMath.initialized = true;
  }

  static glog(n: number) {
    if (n < 1) throw new Error('glog(' + n + ')');
    return QRMath.LOG_TABLE[n];
  }

  static gexp(n: number) {
    while (n < 0) n += 255;
    while (n >= 255) n -= 255;
    return QRMath.EXP_TABLE[n];
  }
}

class Polynomial {
  num: number[];
  constructor(num: number[], shift: number = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[offset + i];
    for (let i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
  }

  get(index: number) {
    return this.num[index];
  }

  getLength() {
    return this.num.length;
  }

  multiply(e: Polynomial): Polynomial {
    const num = new Array(this.getLength() + e.getLength() - 1);
    for (let i = 0; i < num.length; i++) num[i] = 0;
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new Polynomial(num);
  }

  mod(e: Polynomial): Polynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new Polynomial(num).mod(e);
  }
}

class BitBuffer {
  buffer: number[] = [];
  length: number = 0;

  get(index: number) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    this.length++;
  }
}

export class QRCodeEncoder {
  typeNumber: number;
  modules: boolean[][] = [];
  moduleCount: number = 0;
  dataList: string[] = [];

  constructor(typeNumber: number = 4) {
    QRMath.init();
    this.typeNumber = typeNumber;
  }

  addData(data: string) {
    this.dataList.push(data);
  }

  make() {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (let col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null as any;
      }
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupTimingPattern();
    this.setupPositionAdjustPattern();

    const data = this.createData();
    this.mapData(data);
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern() {
    if (this.typeNumber < 2) return;
    const pos = [6, 26];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private createData(): number[] {
    const buffer = new BitBuffer();
    for (let i = 0; i < this.dataList.length; i++) {
      const data = this.dataList[i];
      buffer.put(4, 4); // 8-bit byte mode
      buffer.put(data.length, 8);
      for (let j = 0; j < data.length; j++) {
        buffer.put(data.charCodeAt(j), 8);
      }
    }

    const totalDataCount = 80; // Capacity for Version 4 Level L
    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    while (buffer.length < totalDataCount * 8) {
      buffer.put(0xec, 8);
      if (buffer.length < totalDataCount * 8) buffer.put(0x11, 8);
    }

    const dcdata: number[] = [];
    for (let i = 0; i < buffer.buffer.length; i++) dcdata.push(buffer.buffer[i]);

    // RS Error Correction
    const ecCount = 20;
    let rsPoly = new Polynomial([1]);
    for (let i = 0; i < ecCount; i++) {
      rsPoly = rsPoly.multiply(new Polynomial([1, QRMath.gexp(i)]));
    }
    const rawPoly = new Polynomial(dcdata, ecCount);
    const modPoly = rawPoly.mod(rsPoly);
    const ecdata = new Array(ecCount);
    for (let i = 0; i < ecCount; i++) {
      const modIndex = i + modPoly.getLength() - ecCount;
      ecdata[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
    return dcdata.concat(ecdata);
  }

  private mapData(data: number[]) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = (row + (col - c)) % 2 === 0;
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  isDark(row: number, col: number): boolean {
    return this.modules[row]?.[col] === true;
  }
}

export function getQRCodeMatrix(data: string): boolean[][] {
  try {
    const qr = new QRCodeEncoder(4);
    qr.addData(data.slice(0, 70));
    qr.make();
    return qr.modules;
  } catch {
    return [];
  }
}
