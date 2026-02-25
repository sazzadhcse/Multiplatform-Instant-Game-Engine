import { Container, Sprite, Texture } from "pixi.js";

export class Card extends Container {
  public suit: string;
  public rank: number;
  public isFaceUp: boolean = false;
  
  // A simple array of cards physically sitting on top of this one
  public coveredBy: Card[] = []; 

  private faceSprite: Sprite;
  private backSprite: Sprite;

  constructor(suit: string, rank: number) {
    super();
    this.suit = suit;
    this.rank = rank;

    // Load face
    this.faceSprite = Sprite.from(`assets/images/${suit}${rank}.png`);
    this.faceSprite.anchor.set(0.5);
    this.faceSprite.scale.set(0.8); // Scale down if your card images are large

    // Load back (using a tinted face sprite if you don't have a back image yet)
    this.backSprite = Sprite.from(`assets/images/cardBackBlue.png`);
    this.backSprite.anchor.set(0.5);
    this.backSprite.scale.set(0.8); // Scale down if your card images are large
    // this.backSprite.tint = 0x333333; // Darken to simulate a card back

    this.addChild(this.backSprite, this.faceSprite);
    this.setFaceUp(false);
  }

  public setFaceUp(faceUp: boolean) {
    this.isFaceUp = faceUp;
    this.faceSprite.visible = faceUp;
    this.backSprite.visible = !faceUp;
    
    // Only face-up cards can be clicked
    this.eventMode = faceUp ? "static" : "none";
    this.cursor = faceUp ? "pointer" : "default";
  }

  // Core rule: Is it uncovered, and is it 1 rank higher or lower?
  public canPlayOn(wasteRank: number): boolean {
    if (this.coveredBy.length > 0 || !this.isFaceUp) return false;

    const diff = Math.abs(this.rank - wasteRank);
    return diff === 1 || diff === 12; // 1 = adjacent, 12 = wrap King to Ace
  }

  //for level editor
  public changeCard(suit: string, rank: number) {
    this.suit = suit;
    this.rank = rank;
    
    // Dynamically update the visual texture
    this.faceSprite.texture = Texture.from(`assets/images/${suit}${rank}.png`);
  }
}