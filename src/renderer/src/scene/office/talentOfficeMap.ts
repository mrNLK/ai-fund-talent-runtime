const width = 34;
const height = 22;
const tile = (x: number, y: number): number => y * width + x;

const floor = Array<number>(width * height).fill(1);
const walls = Array<number>(width * height).fill(0);
const furniture = Array<number>(width * height).fill(0);
const collision = Array<number>(width * height).fill(0);

for (let x = 0; x < width; x += 1) {
  walls[tile(x, 0)] = 2;
  walls[tile(x, height - 1)] = 2;
  collision[tile(x, 0)] = 1;
  collision[tile(x, height - 1)] = 1;
}
for (let y = 0; y < height; y += 1) {
  walls[tile(0, y)] = 2;
  walls[tile(width - 1, y)] = 2;
  collision[tile(0, y)] = 1;
  collision[tile(width - 1, y)] = 1;
}

const deskTiles: Array<[number, number]> = [
  [4, 4], [8, 7], [13, 7], [18, 7], [23, 7], [28, 7],
  [8, 13], [13, 13], [18, 13], [23, 13], [28, 13]
];
for (const [x, y] of deskTiles) {
  furniture[tile(x, y)] = 3;
  collision[tile(x, y)] = 1;
}

// Task board and evidence wall.
for (let x = 13; x <= 20; x += 1) furniture[tile(x, 2)] = 4;

const point = (name: string, x: number, y: number) => ({
  id: 0, name, type: '', x: x * 16, y: y * 16,
  width: 0, height: 0, rotation: 0, visible: true, point: true
});

const map = {
  compressionlevel: -1,
  height,
  infinite: false,
  layers: [
    { data: floor, height, id: 1, name: 'floor', opacity: 1, type: 'tilelayer', visible: true, width, x: 0, y: 0 },
    { data: walls, height, id: 2, name: 'walls', opacity: 1, type: 'tilelayer', visible: true, width, x: 0, y: 0 },
    { data: furniture, height, id: 3, name: 'furniture-below', opacity: 1, type: 'tilelayer', visible: true, width, x: 0, y: 0 },
    { data: Array<number>(width * height).fill(0), height, id: 4, name: 'furniture-above', opacity: 1, type: 'tilelayer', visible: true, width, x: 0, y: 0 },
    { data: collision, height, id: 5, name: 'collision', opacity: 1, type: 'tilelayer', visible: true, width, x: 0, y: 0 },
    {
      draworder: 'topdown', id: 6, name: 'spawn-points', opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0,
      objects: [
        point('desk-ceo', 4, 5), point('pc-1', 8, 8), point('pc-2', 13, 8),
        point('pc-3', 18, 8), point('pc-4', 23, 8), point('pc-5', 28, 8),
        point('pc-6', 8, 14), point('desk-team-lead', 13, 14),
        point('desk-backend-engineer', 18, 14), point('desk-product-manager', 23, 14),
        point('desk-data-engineer', 28, 14), point('desk-project-manager', 8, 18),
        point('desk-market-researcher', 13, 18), point('desk-agent-organizer', 18, 18),
        point('warroom-seat', 23, 18), point('desk-chief-architect', 28, 18),
        point('desk-ui-ux-expert', 4, 18), point('entrance', 17, 20),
        point('cafe-seat-1', 27, 18), point('cafe-seat-2', 29, 18),
        point('cafe-seat-3', 27, 19), point('cafe-seat-4', 29, 19),
        point('cafe-stand-coffee', 30, 17), point('cafe-stand-vending', 31, 17)
      ]
    },
    {
      draworder: 'topdown', id: 7, name: 'zones', opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0,
      objects: [
        { id: 0, name: 'boardroom', type: '', x: 176, y: 16, width: 192, height: 64, rotation: 0, visible: true },
        { id: 0, name: 'cafeteria', type: '', x: 400, y: 256, width: 112, height: 64, rotation: 0, visible: true }
      ]
    }
  ],
  nextlayerid: 8,
  nextobjectid: 1,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.12.0',
  tileheight: 16,
  tilesets: [{
    columns: 4, firstgid: 1, image: '../tilesets/ai-fund-office.svg', imageheight: 16,
    imagewidth: 64, margin: 0, name: 'ai-fund-office', spacing: 0,
    tilecount: 4, tileheight: 16, tilewidth: 16
  }],
  tilewidth: 16,
  type: 'map',
  version: '1.10',
  width
};

export const talentOfficeMapRaw = JSON.stringify(map);
