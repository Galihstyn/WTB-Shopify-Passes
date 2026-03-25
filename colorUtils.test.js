import { hsvToHex, hexToHsv } from './colorUtils';

describe('hsvToHex', () => {
  test('converts HSV to Hex correctly for standard colors', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#ff0000'); // Red
    expect(hsvToHex(120, 100, 100)).toBe('#00ff00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000ff'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#ffffff'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });

  test('handles hue edge cases 0 and 360', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#ff0000');
    expect(hsvToHex(360, 100, 100)).toBe('#ff0000');
  });

  test('handles saturation and value edge cases', () => {
    expect(hsvToHex(180, 0, 50)).toBe('#808080'); // Gray
    expect(hsvToHex(180, 100, 0)).toBe('#000000'); // Black (Value 0)
    expect(hsvToHex(180, 0, 100)).toBe('#ffffff'); // White (Sat 0, Val 100)
  });

  test('bidirectional conversion with hexToHsv', () => {
    const hex = '#3b82f6';
    const { h, s, v } = hexToHsv(hex);
    expect(hsvToHex(h, s, v)).toBe(hex);

    const hex2 = '#e11d48';
    const { h: h2, s: s2, v: v2 } = hexToHsv(hex2);
    expect(hsvToHex(h2, s2, v2)).toBe(hex2);
  });
});
