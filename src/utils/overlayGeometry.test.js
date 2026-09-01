import {
  computeContainTransform,
  mapPointToVideo,
  mapOverlayToVideo,
  mapOverlaysToVideo,
} from './overlayGeometry';

describe('computeContainTransform', () => {
  it('is identity-scale (up to a constant factor) when container and video share aspect ratio', () => {
    // 270x480 reference container, 1080x1920 standardized video - both exactly 9:16.
    const t = computeContainTransform(270, 480, 1080, 1920);
    expect(t.scale).toBeCloseTo(0.25); // 270/1080 === 480/1920
    expect(t.offsetX).toBeCloseTo(0);
    expect(t.offsetY).toBeCloseTo(0);
  });

  it('letterboxes the shorter axis when the video is squarer than the container', () => {
    const t = computeContainTransform(300, 500, 1000, 1000);
    expect(t.scale).toBeCloseTo(0.3);
    expect(t.offsetX).toBeCloseTo(0);
    expect(t.offsetY).toBeCloseTo(100);
  });

  it('throws on missing/zero dimensions instead of silently producing Infinity/NaN', () => {
    expect(() => computeContainTransform(0, 480, 1080, 1920)).toThrow();
    expect(() => computeContainTransform(270, 480, 0, 1920)).toThrow();
    expect(() => computeContainTransform(270, undefined, 1080, 1920)).toThrow();
  });
});

describe('mapPointToVideo', () => {
  it('maps the container center to the video center under contain letterboxing', () => {
    const t = computeContainTransform(300, 500, 1000, 1000);
    const p = mapPointToVideo({ x: 150, y: 250 }, t);
    expect(p.x).toBeCloseTo(500);
    expect(p.y).toBeCloseTo(500);
  });

  it('maps the container origin to the correct offset video pixel', () => {
    const t = computeContainTransform(270, 480, 1080, 1920);
    const p = mapPointToVideo({ x: 0, y: 0 }, t);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
  });
});

describe('mapOverlayToVideo', () => {
  const t = computeContainTransform(270, 480, 1080, 1920); // uniform 4x scale-up

  it('scales position, width, height and fontSize by the same uniform factor', () => {
    const photo = {
      uri: 'file://photo.jpg',
      x: 50,
      y: 100,
      width: 60,
      height: 60,
      borderRadius: 8,
      shape: 'circle',
    };
    const mapped = mapOverlayToVideo(photo, t);
    expect(mapped).toMatchObject({
      uri: 'file://photo.jpg',
      shape: 'circle',
      x: 200,
      y: 400,
      width: 240,
      height: 240,
      borderRadius: 32,
    });
  });

  it('scales fontSize and preserves styling fields untouched', () => {
    const text = {
      text: 'Happy Birthday!',
      x: 20,
      y: 40,
      width: 120,
      height: 40,
      fontSize: 18,
      color: '#FFD700',
      fontWeight: 'bold',
      backgroundColor: 'rgba(0,0,0,0.8)',
      textAlign: 'center',
    };
    const mapped = mapOverlayToVideo(text, t);
    expect(mapped.fontSize).toBe(72); // 18 / 0.25
    expect(mapped.color).toBe('#FFD700');
    expect(mapped.fontWeight).toBe('bold');
    expect(mapped.backgroundColor).toBe('rgba(0,0,0,0.8)');
    expect(mapped.textAlign).toBe('center');
  });

  it('leaves width/height/fontSize undefined when not provided on the input overlay', () => {
    const banner = { uri: 'file://banner.png', x: 0, y: 0 };
    const mapped = mapOverlayToVideo(banner, t);
    expect(mapped.width).toBeUndefined();
    expect(mapped.height).toBeUndefined();
    expect(mapped.fontSize).toBeUndefined();
  });
});

describe('mapOverlaysToVideo', () => {
  const t = computeContainTransform(270, 480, 1080, 1920);

  it('maps a list of overlays and preserves order', () => {
    const overlays = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 10, width: 20, height: 20 },
    ];
    const mapped = mapOverlaysToVideo(overlays, t);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].width).toBe(40);
    expect(mapped[1].width).toBe(80);
  });

  it('returns an empty array for null/undefined input', () => {
    expect(mapOverlaysToVideo(null, t)).toEqual([]);
    expect(mapOverlaysToVideo(undefined, t)).toEqual([]);
  });
});
