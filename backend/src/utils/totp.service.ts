import crypto from 'crypto';

// --- Base32 Implementation (RFC 4648) ---
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < cleanInput.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanInput[i]);
    if (idx === -1) throw new Error(`Invalid Base32 character: ${cleanInput[i]}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// --- RFC 6238 TOTP Core ---
export function generateTOTPSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function formatSecretKey(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

export function getTOTPUri(email: string, secret: string, issuer: string = 'Akwaaba Homes'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateTOTPCode(secretBase32: string, timeStep: number = 30, t: number = Date.now()): string {
  const counter = Math.floor(t / 1000 / timeStep);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));

  const key = base32Decode(secretBase32);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

export function verifyTOTPCode(token: string, secretBase32: string, window: number = 2): boolean {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  const now = Date.now();
  for (let w = -window; w <= window; w++) {
    const checkTime = now + w * 30 * 1000;
    const expected = generateTOTPCode(secretBase32, 30, checkTime);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

// --- Recovery Codes (One-Time Emergency Access) ---
export function generateRecoveryCodes(count: number = 8): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buf = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${buf.slice(0, 4)}-${buf.slice(4, 8)}`;
    rawCodes.push(formatted);
    hashedCodes.push(hashRecoveryCode(formatted));
  }
  return { rawCodes, hashedCodes };
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function verifyAndConsumeRecoveryCode(
  code: string,
  hashedCodesJson: string | null
): { valid: boolean; remainingHashedCodes: string[] | null } {
  if (!code || !hashedCodesJson) return { valid: false, remainingHashedCodes: null };
  let hashedList: string[] = [];
  try {
    hashedList = JSON.parse(hashedCodesJson);
    if (!Array.isArray(hashedList)) return { valid: false, remainingHashedCodes: null };
  } catch (e) {
    return { valid: false, remainingHashedCodes: null };
  }
  const targetHash = hashRecoveryCode(code);
  const foundIndex = hashedList.findIndex(h => h === targetHash);
  if (foundIndex !== -1) {
    const remaining = [...hashedList];
    remaining.splice(foundIndex, 1);
    return { valid: true, remainingHashedCodes: remaining };
  }
  return { valid: false, remainingHashedCodes: null };
}

// --- Lightweight Pure TypeScript QR Code Generator ---
class QRMath {
  static EXP_TABLE = new Array(256);
  static LOG_TABLE = new Array(256);
  static init() {
    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
  }
  static glog(n: number): number {
    if (n < 1) throw new Error('glog(' + n + ')');
    return QRMath.LOG_TABLE[n];
  }
  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 255) n -= 255;
    return QRMath.EXP_TABLE[n];
  }
}
QRMath.init();

class QRPolynomial {
  num: number[];
  constructor(num: number[], shift: number) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (let i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
  }
  get(index: number): number {
    return this.num[index];
  }
  getLength(): number {
    return this.num.length;
  }
  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num, 0);
  }
  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

class QRBitBuffer {
  buffer: number[] = [];
  length: number = 0;
  get(index: number): boolean {
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

const RS_BLOCK_TABLE: { [key: number]: number[] } = {
  1: [1, 26, 16],
  2: [1, 44, 28],
  3: [1, 70, 44],
  4: [2, 50, 32],
  5: [2, 67, 43],
  6: [4, 43, 27],
  7: [4, 72, 31],
  8: [2, 68, 38, 2, 69, 39],
  9: [3, 36, 26, 2, 37, 27],
  10: [4, 43, 18, 1, 44, 19]
};

function getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
  let a = new QRPolynomial([1], 0);
  for (let i = 0; i < errorCorrectLength; i++) {
    a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
  }
  return a;
}

export class QRCodeEncoder {
  typeNumber: number;
  modules: (boolean | null)[][] = [];
  moduleCount: number = 0;
  dataList: string = '';

  constructor(typeNumber: number = 4) {
    this.typeNumber = typeNumber;
  }

  addData(data: string) {
    this.dataList += data;
  }

  make() {
    if (this.typeNumber < 1) this.typeNumber = 1;
    while (this.typeNumber <= 10) {
      try {
        this.makeImpl();
        break;
      } catch (e) {
        this.typeNumber++;
        if (this.typeNumber > 10) throw e;
      }
    }
  }

  private makeImpl() {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(0);
    const data = this.createData(this.typeNumber);
    this.mapData(data, 0);
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
    const pos = [6, 18, 22, 26, 30, 34][this.typeNumber - 2] || (this.moduleCount - 7);
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (this.modules[pos + r][pos + c] !== null) continue;
        this.modules[pos + r][pos + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      }
    }
  }

  private setupTypeInfo(maskPattern: number) {
    const bits = 0x5412 ^ ((0b00 << 3) | maskPattern);
    for (let i = 0; i < 15; i++) {
      const mod = ((bits >> i) & 1) === 1;
      if (i < 6) this.modules[i][8] = mod;
      else if (i < 8) this.modules[i + 1][8] = mod;
      else this.modules[this.moduleCount - 15 + i][8] = mod;

      if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
      else this.modules[8][15 - i - 1] = mod;
    }
    this.modules[this.moduleCount - 8][8] = true;
  }

  private createData(typeNumber: number): number[] {
    const rs = RS_BLOCK_TABLE[typeNumber] || [1, 70, 44];
    const totalDataCount = rs[0] * rs[2];
    const buffer = new QRBitBuffer();
    buffer.put(4, 4);
    buffer.put(this.dataList.length, typeNumber < 10 ? 8 : 16);
    for (let i = 0; i < this.dataList.length; i++) {
      buffer.put(this.dataList.charCodeAt(i), 8);
    }
    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (buffer.length < totalDataCount * 8) {
      buffer.put(padBytes[padIdx % 2], 8);
      padIdx++;
    }
    const rawData: number[] = [];
    for (let i = 0; i < buffer.length / 8; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        if (buffer.get(i * 8 + j)) b |= 1 << (7 - j);
      }
      rawData.push(b);
    }
    const ecLength = (rs[1] - rs[2]);
    const rsPoly = getErrorCorrectPolynomial(ecLength);
    const rawPoly = new QRPolynomial(rawData, ecLength);
    const modPoly = rawPoly.mod(rsPoly);
    const ecData: number[] = new Array(ecLength).fill(0);
    for (let i = 0; i < ecLength; i++) {
      const modIndex = i + modPoly.getLength() - ecLength;
      ecData[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
    return [...rawData, ...ecData];
  }

  private mapData(data: number[], maskPattern: number) {
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

  toSvg(size: number = 240, margin: number = 2): string {
    const boxSize = size / (this.moduleCount + margin * 2);
    let d = '';
    for (let r = 0; r < this.moduleCount; r++) {
      for (let c = 0; c < this.moduleCount; c++) {
        if (this.isDark(r, c)) {
          const x = (c + margin) * boxSize;
          const y = (r + margin) * boxSize;
          d += 'M' + x.toFixed(2) + ',' + y.toFixed(2) + 'h' + boxSize.toFixed(2) + 'v' + boxSize.toFixed(2) + 'h-' + boxSize.toFixed(2) + 'z ';
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#FFFFFF" rx="12"/><path d="' + d.trim() + '" fill="#0F5132"/></svg>';
  }
}

export function generateQRCodeSvg(data: string, size: number = 240): string {
  const qr = new QRCodeEncoder(4);
  qr.addData(data);
  qr.make();
  return qr.toSvg(size);
}