export interface LevelCard { suit: string; rank: number; }

export interface LevelLayoutSlot extends LevelCard {
  x: number;
  y: number;
  angle?: number;      // Rotation in degrees
  covers?: number[];   // Indexes of cards this card sits on top of
}

export interface LevelData {
  id: string;
  wasteCard: LevelCard;
  stockPile: LevelCard[];
  layout: LevelLayoutSlot[];
}
