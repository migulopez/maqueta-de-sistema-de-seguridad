/** Web Serial transport. Firmware emits one JSON telemetry object per line. No fallback to simulated telemetry. */
export class ArduinoConnection {
  constructor(onTelemetry, onDisconnect) {
    this.onTelemetry = onTelemetry;
    this.onDisconnect = onDisconnect;
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.connected = false;
    this.keepReading = false;
    this.lastPacket = 0;
  }
  async connect() {
    if (!('serial' in navigator)) throw new Error('Web Serial no está disponible. Usa Chrome o Edge en HTTPS o localhost.');
    this.port = await navigator.serial.requestPort();
    try {
      await this.port.open({ baudRate: 115200 });
      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();
      this.connected = true;
      this.keepReading = true;
      this.readLoop();
    } catch (error) {
      try { await this.port.close(); } catch { /* port may not have opened */ }
      this.port = null;
      throw error;
    }
  }
  async readLoop() {
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (this.keepReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.length > 8192) buffer = buffer.slice(-4096);
        let end;
        while ((end = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, end).trim();
          buffer = buffer.slice(end + 1);
          try {
            const data = JSON.parse(line);
            if (typeof data.distanceCm === 'number' && typeof data.ldr === 'number' && typeof data.sound === 'number') {
              this.lastPacket = Date.now();
              this.onTelemetry(data);
            }
          } catch { /* ignore boot diagnostics and malformed packets */ }
        }
      }
    } catch (error) {
      if (this.keepReading) this.onDisconnect(`Comunicación interrumpida: ${error.message}`);
    } finally {
      this.connected = false;
      this.keepReading = false;
      try { this.reader?.releaseLock(); } catch { /* already released */ }
      this.reader = null;
      this.onDisconnect('Conexión serial finalizada. Telemetría no disponible.');
    }
  }
  async send(command) {
    if (!this.connected || !this.writer) return;
    try { await this.writer.write(new TextEncoder().encode(JSON.stringify(command) + '\n')); }
    catch { this.onDisconnect('No se pudo enviar el comando al Arduino.'); }
  }
  async disconnect() {
    this.keepReading = false;
    try { await this.reader?.cancel(); } catch { /* already closed */ }
    try { this.writer?.releaseLock(); } catch { /* already released */ }
    this.writer = null;
    try { await this.port?.close(); } catch { /* disconnected by device */ }
    this.port = null;
    this.connected = false;
  }
}
