import { Container, Text, Sprite, Graphics, FederatedPointerEvent, FederatedWheelEvent } from "pixi.js";
import { BaseScene, type GameContext } from "../Scene.js";
import { Card } from "../entities/Card.js";

export class LevelEditorScene extends BaseScene {
  private editorCards: Card[] = [];      // Cards in the pyramid/board
  private editorStockCards: Card[] = []; // Cards in the stockpile

  private draggingCard: Card | null = null;
  private dragOffset = { x: 0, y: 0 };

  // Selection & Brush Variables
  private selectedCard: Card | null = null;
  private currentSuitIdx = 0;
  private suits = ["spade", "heart", "club", "diamond"];
  private currentRank = 1;
  
  private btnSuitText!: Text;
  private txtRankDisplay!: Text;

  constructor(context: GameContext) {
    super("LevelEditorScene", context);
  }

  async create(): Promise<void> {
    const layers = this.getLayers();

    const bg = Sprite.from("assets/images/bgGameplay.jpg");
    bg.anchor.set(0.5);
    bg.position.set(this.context.DESIGN_W / 2, this.context.DESIGN_H / 2);
    layers.bgLayer.addChild(bg);

    this.context.app.stage.eventMode = "static";
    this.context.app.stage.on("pointermove", this.onDragMove, this);
    this.context.app.stage.on("pointerup", this.onDragEnd, this);
    this.context.app.stage.on("pointerupoutside", this.onDragEnd, this);

    this.setupUI(layers.uiLayer);
    
    // Crucial for allowing Z-Index swapping
    layers.worldLayer.sortableChildren = true; 
  }

  private setupUI(uiLayer: Container) {
    const topBar = new Graphics().rect(0, 0, this.context.DESIGN_W, 80).fill({ color: 0x111827, alpha: 0.9 });
    uiLayer.addChild(topBar);

    const instructions = new Text({ 
      text: "Left Click: Select/Drag | Scroll: Rotate | Right Click: Delete", 
      style: { fill: 0xaaaaaa, fontSize: 18 } 
    });
    instructions.position.set(20, 25);
    uiLayer.addChild(instructions);

    // --- BRUSH UI ---
    const btnSuit = this.createButton(`Suit: ${this.suits[this.currentSuitIdx]}`, 0x3b82f6, 180, () => this.cycleSuit());
    btnSuit.position.set(450, 15);
    this.btnSuitText = btnSuit.getChildAt(1) as Text;
    uiLayer.addChild(btnSuit);

    const btnRankMinus = this.createButton("-", 0xef4444, 50, () => this.decreaseRank());
    btnRankMinus.position.set(650, 15);
    uiLayer.addChild(btnRankMinus);

    this.txtRankDisplay = new Text({ text: `Rank: ${this.currentRank}`, style: { fill: 0xffffff, fontSize: 24, fontWeight: "bold" } });
    this.txtRankDisplay.anchor.set(0.5);
    this.txtRankDisplay.position.set(765, 40);
    uiLayer.addChild(this.txtRankDisplay);

    const btnRankPlus = this.createButton("+", 0xef4444, 50, () => this.increaseRank());
    btnRankPlus.position.set(830, 15);
    uiLayer.addChild(btnRankPlus);

    // --- ACTION BUTTONS ---
    const btnAddBoard = this.createButton("Add Board", 0x00ff88, 140, () => this.spawnEditorCard(false));
    btnAddBoard.position.set(900, 15);
    uiLayer.addChild(btnAddBoard);

    const btnAddStock = this.createButton("Add Stock", 0xa855f7, 140, () => this.spawnEditorCard(true));
    btnAddStock.position.set(1060, 15);
    uiLayer.addChild(btnAddStock);

    // --- NEW: INDEX CONTROLS ---
    const btnIdxMinus = this.createButton("Idx -", 0xf59e0b, 80, () => this.moveSelectedCardIndex(-1));
    btnIdxMinus.position.set(1220, 15);
    uiLayer.addChild(btnIdxMinus);

    const btnIdxPlus = this.createButton("Idx +", 0xf59e0b, 80, () => this.moveSelectedCardIndex(1));
    btnIdxPlus.position.set(1310, 15);
    uiLayer.addChild(btnIdxPlus);

    // --- IMPORT / EXPORT ---
    const btnImport = this.createButton("Import JSON", 0x14b8a6, 160, () => this.importLevelData());
    btnImport.position.set(1420, 15);
    uiLayer.addChild(btnImport);

    const btnExport = this.createButton("Export JSON", 0xffaa00, 160, () => this.exportLevelData());
    btnExport.position.set(1600, 15);
    uiLayer.addChild(btnExport);
  }

  private createButton(label: string, color: number, width: number, onClick: () => void): Container {
    const btn = new Container();
    const bg = new Graphics().roundRect(0, 0, width, 50, 8).fill({ color });
    const text = new Text({ text: label, style: { fill: 0x111, fontSize: 22, fontWeight: "bold" } });
    text.anchor.set(0.5);
    text.position.set(width / 2, 25);
    
    btn.addChild(bg, text);
    btn.eventMode = "static";
    btn.cursor = "pointer";
    
    btn.on("pointerdown", () => { bg.tint = 0xcccccc; onClick(); });
    btn.on("pointerup", () => bg.tint = 0xffffff);
    btn.on("pointerupoutside", () => bg.tint = 0xffffff);

    return btn;
  }

  // --- NEW: LAYER INDEX MANAGEMENT ---
  private refreshIndices() {
    this.editorCards.forEach((card, index) => {
      // 1. Update visual rendering order
      card.zIndex = index;
      
      // 2. Update the visual text label
      const label = card.getChildByName("indexLabel") as Text;
      if (label) {
        label.text = index.toString();
      }
    });
    
    // Tell the PIXI container to re-sort based on our new zIndex values
    this.getLayers().worldLayer.sortChildren();
  }

  private moveSelectedCardIndex(direction: number) {
    if (!this.selectedCard || !this.editorCards.includes(this.selectedCard)) return;

    const currentIndex = this.editorCards.indexOf(this.selectedCard);
    const newIndex = currentIndex + direction;

    // Prevent moving out of bounds
    if (newIndex < 0 || newIndex >= this.editorCards.length) return;

    // Swap the cards in the array
    const temp = this.editorCards[newIndex];
    this.editorCards[newIndex] = this.selectedCard;
    this.editorCards[currentIndex] = temp;

    // Visually update the board
    this.refreshIndices();
  }

  // --- BRUSH MODIFIERS ---
  private cycleSuit() {
    this.currentSuitIdx = (this.currentSuitIdx + 1) % 4;
    this.updateUIText();
    this.applyToSelected();
  }

  private increaseRank() {
    this.currentRank = this.currentRank < 13 ? this.currentRank + 1 : 1;
    this.updateUIText();
    this.applyToSelected();
  }

  private decreaseRank() {
    this.currentRank = this.currentRank > 1 ? this.currentRank - 1 : 13;
    this.updateUIText();
    this.applyToSelected();
  }

  private updateUIText() {
    this.btnSuitText.text = `Suit: ${this.suits[this.currentSuitIdx]}`;
    this.txtRankDisplay.text = `Rank: ${this.currentRank}`;
  }

  private applyToSelected() {
    if (this.selectedCard) {
      this.selectedCard.changeCard(this.suits[this.currentSuitIdx], this.currentRank);
    }
  }

  private selectCard(card: Card) {
    if (this.selectedCard) this.selectedCard.alpha = 1.0; 
    this.selectedCard = card;
    this.selectedCard.alpha = 0.7; 

    this.currentSuitIdx = this.suits.indexOf(card.suit);
    this.currentRank = card.rank;
    this.updateUIText();
  }

  // --- CARD SPAWNING & BINDING ---
  private spawnEditorCard(isStockCard: boolean, specificSuit?: string, specificRank?: number, x?: number, y?: number, angle?: number) {
    const suit = specificSuit || this.suits[this.currentSuitIdx];
    const rank = specificRank || this.currentRank;
    
    const card = new Card(suit, rank);
    card.setFaceUp(true); 
    card.eventMode = "static";
    card.cursor = "pointer";

    if (isStockCard) {
      this.bindStockCardEvents(card);
      this.editorStockCards.push(card);
      this.getLayers().worldLayer.addChild(card);
      this.repositionStockCards();
    } else {
      card.position.set(x ?? this.context.DESIGN_W / 2, y ?? 400);
      card.angle = angle || 0;
      
      // --- NEW: Add Visual Index Text ---
      const idxLabel = new Text({
        text: this.editorCards.length.toString(),
        style: { fill: 0xffea00, fontSize: 36, fontWeight: "bold", stroke: { color: 0x000000, width: 5 } }
      });
      idxLabel.anchor.set(0.5);
      idxLabel.name = "indexLabel"; 
      card.addChild(idxLabel);

      this.bindBoardCardEvents(card);
      this.editorCards.push(card);
      this.getLayers().worldLayer.addChild(card);
      this.refreshIndices();
    }
    
    this.selectCard(card);
  }

  private bindStockCardEvents(card: Card) {
    card.on("pointerdown", (e: FederatedPointerEvent) => {
      if (e.button === 2) { 
        this.editorStockCards = this.editorStockCards.filter(c => c !== card);
        if (this.selectedCard === card) this.selectedCard = null;
        card.destroy();
        this.repositionStockCards(); 
        return;
      }
      this.selectCard(card);
    });
  }

  private bindBoardCardEvents(card: Card) {
    card.on("pointerdown", (e: FederatedPointerEvent) => {
      if (e.button === 2) { 
        this.editorCards = this.editorCards.filter(c => c !== card);
        if (this.selectedCard === card) this.selectedCard = null;
        card.destroy();
        this.refreshIndices(); // Update all indices when a card is deleted
        return;
      }
      
      this.selectCard(card);
      
      this.draggingCard = card;
      const localPoint = card.parent.toLocal(e.global);
      this.dragOffset.x = card.x - localPoint.x;
      this.dragOffset.y = card.y - localPoint.y;
    });

    card.on("wheel", (e: FederatedWheelEvent) => {
      const direction = Math.sign(e.deltaY);
      card.angle += direction * 5;
    });
  }

  private repositionStockCards() {
    const startX = 150;
    const startY = this.context.DESIGN_H - 120; 
    const spacing = 45;

    this.editorStockCards.forEach((card, index) => {
      card.position.set(startX + (index * spacing), startY);
    });
  }

  // --- DRAGGING ---
  private onDragMove(e: FederatedPointerEvent) {
    if (this.draggingCard) {
      const localPoint = this.draggingCard.parent.toLocal(e.global);
      this.draggingCard.x = Math.round(localPoint.x + this.dragOffset.x);
      this.draggingCard.y = Math.round(localPoint.y + this.dragOffset.y);
    }
  }

  private onDragEnd() {
    this.draggingCard = null;
  }

  // --- JSON IMPORT ---
  private async importLevelData() {
    try {
      const jsonText = prompt("Paste your Level JSON data here:");
      if (!jsonText) return;

      const data = JSON.parse(jsonText);

      this.editorCards.forEach(c => c.destroy());
      this.editorStockCards.forEach(c => c.destroy());
      this.editorCards = [];
      this.editorStockCards = [];
      this.selectedCard = null;

      if (data.stockPile) {
        data.stockPile.forEach((stock: any) => this.spawnEditorCard(true, stock.suit, stock.rank));
      }

      if (data.layout) {
        data.layout.forEach((slot: any) => this.spawnEditorCard(false, slot.suit, slot.rank, slot.x, slot.y, slot.angle));
        this.refreshIndices(); // Fix layers after bulk load
      }

    } catch (err) {
      alert("Invalid JSON format! Make sure you copied the whole object.");
      console.error(err);
    }
  }

  // --- JSON EXPORT ---
  private exportLevelData() {
    const CARD_WIDTH = 80;
    const CARD_HEIGHT = 120;

    const layout = this.editorCards.map((card) => {
      return {
        suit: card.suit,
        rank: card.rank,
        x: Math.round(card.x),
        y: Math.round(card.y),
        angle: Math.round(card.angle),
        covers: [] as number[]
      };
    });

    // for (let bottomIndex = 0; bottomIndex < layout.length; bottomIndex++) {
    //   const bottomCard = layout[bottomIndex];
    //   for (let topIndex = bottomIndex + 1; topIndex < layout.length; topIndex++) {
    //     const topCard = layout[topIndex];
    //     const dx = Math.abs(topCard.x - bottomCard.x);
    //     const dy = Math.abs(topCard.y - bottomCard.y);

    //     if (dx < CARD_WIDTH * 0.8 && dy < CARD_HEIGHT * 0.8) {
    //       bottomCard.covers.push(topIndex);
    //     }
    //   }
    // }

    for (let bottomIndex = 0; bottomIndex < layout.length; bottomIndex++) {
      const bottomCard = layout[bottomIndex];
      for (let topIndex = bottomIndex + 1; topIndex < layout.length; topIndex++) {
        const topCard = layout[topIndex];
        const dx = Math.abs(topCard.x - bottomCard.x);
        const dy = Math.abs(topCard.y - bottomCard.y);

        if (dx < CARD_WIDTH * 0.8 && dy < CARD_HEIGHT * 0.8) {
          // CORRECT: This tells the top card it sits on top of the bottom index
          topCard.covers.push(bottomIndex); 
        }
      }
    }

    const stockPile = this.editorStockCards.map((card) => {
      return { suit: card.suit, rank: card.rank };
    });

    const exportData = {
      id: "level_custom",
      wasteCard: { suit: "heart", rank: 1 }, 
      stockPile: stockPile,
      layout: layout
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    navigator.clipboard.writeText(jsonString).then(() => {
      alert(`Exported ${layout.length} board cards and ${stockPile.length} stock cards to Clipboard!`);
    }).catch(err => {
      alert("Failed to copy. Data printed to browser console.");
    });
  }

  destroy(): void {
    this.context.app.stage.off("pointermove", this.onDragMove, this);
    this.context.app.stage.off("pointerup", this.onDragEnd, this);
    this.context.app.stage.off("pointerupoutside", this.onDragEnd, this);
    super.destroy();
  }
}