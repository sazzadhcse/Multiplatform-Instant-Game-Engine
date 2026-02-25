import { Container, Text, Sprite, Graphics } from "pixi.js";
import { gsap } from "gsap";
import { BaseScene, type GameContext } from "../Scene";
import { CompleteScene } from "./CompleteScene";
import { Card } from "../entities/Card";
// import { LEVEL_1, LEVEL_LAKESIDE, LevelData } from "../logic/Levels.js";
import type { LevelData } from "../entities/Levels";
import { DialogManager } from "../managers/DialogManager";
import { MenuScene } from "./MenuScene";

// 1. Define what a "Move" looks like for our Undo History
interface GameHistory {
  type: 'tableau' | 'stock';
  playedCard: Card;
  previousWaste: Card;
  flippedCards: Card[]; // Cards that were flipped up by this move
  coveredCards: Card[]; // Cards that were previously covered by this card
  originalX?: number;   // Where the card used to be
  originalY?: number;
  originalAngle?: number;
}

export class GameplayScene extends BaseScene {
  private tableau: Card[] = [];
  private stockPile: Card[] = [];
  private wasteCard!: Card;
  private levelData: LevelData;
  
  // Game State & History
  private history: GameHistory[] = [];
  private isFirstPlay = true;
  private coins: number = 1250;
  
  // Layout Constants
  private readonly WASTE_X = 1100;
  private readonly WASTE_Y = 900;
  private readonly STOCK_X = 780;
  private readonly STOCK_Y = 900;
  
  // UI Elements
  private uiContainer = new Container();
  private stockText!: Text;
  private coinText!: Text;
  
  // Tutorial Elements
  private tutorialBubble!: Container;
  private tutorialText!: Text;
  private parrotSprite!: Sprite;
  
  private dialogManager: DialogManager;
  
  constructor(context: GameContext, levelData: LevelData) {
    super("GameplayScene", context);
    // this.levelData = LEVEL_LAKESIDE; 
    this.levelData = levelData;
    this.dialogManager = new DialogManager();
  }
  
  async create(): Promise<void> {
    const layers = this.getLayers();
    
    const bg = Sprite.from("assets/images/bgGameplay.jpg");
    bg.anchor.set(0.5);
    bg.position.set(this.context.DESIGN_W / 2, this.context.DESIGN_H / 2);
    layers.bgLayer.addChild(bg);

    this.context.audio.playMusic("bgm_gameplay");
    
    this.buildBoard(layers.worldLayer);
    this.setupVisualStockAndWaste(layers.worldLayer);
    this.setupUI(layers.uiLayer);
    
    const currentLevel = this.context.progress?.currentLevel || 1;
    if (currentLevel <= 2) {
      this.showTutorial("Tap a card that is 1 higher or lower than the card on the bottom of the screen!");
    }

    // setTimeout(() => {
    //   this.triggerWinEffect();
    // }, 1000);
  }

  private addLabel(parent: Container, string: string, style: any, offsetX = 0, offsetY = 0): Text {
    const text = new Text({ text: string, style });
    text.anchor.set(0.5);
    text.x = offsetX; 
    text.y = offsetY;
    parent.addChild(text);
    return text;
  }
  
  private makeInteractive(target: Sprite, onClick: () => void): void {
    target.eventMode = 'static';
    target.cursor = 'pointer';

    target.on('pointerover', () => {
      target.scale.set(1.1); 
      target.tint = 0xeeeeee;
    });
    target.on('pointerout', () => {
      target.scale.set(1.0);
      target.tint = 0xffffff;
    });
    target.on('pointerdown', () => target.scale.set(0.9));
    target.on('pointerup', () => {
      target.scale.set(1.1);
      onClick();
    });
  }

  private buildBoard(worldLayer: Container) {
    for (const slot of this.levelData.layout) {
      const card = new Card(slot.suit, slot.rank);
      card.position.set(slot.x, slot.y);
      card.angle = slot.angle || 0; 
      
      card.on("pointerdown", () => this.handleCardClick(card));
      worldLayer.addChild(card);
      this.tableau.push(card);
    }
    
    for (let i = 0; i < this.levelData.layout.length; i++) {
      const slotData = this.levelData.layout[i];
      const topCard = this.tableau[i];
      
      if (slotData.covers) {
        for (const bottomIndex of slotData.covers) {
          const bottomCard = this.tableau[bottomIndex];
          if (bottomCard) bottomCard.coveredBy.push(topCard);
        }
      }
    }
    
    for (const card of this.tableau) {
      if (card.coveredBy.length === 0) card.setFaceUp(true);
    }
  }
  
  private setupVisualStockAndWaste(worldLayer: Container) {
    this.wasteCard = new Card(this.levelData.wasteCard.suit, this.levelData.wasteCard.rank);
    this.wasteCard.setFaceUp(true);
    this.wasteCard.position.set(this.WASTE_X, this.WASTE_Y);
    worldLayer.addChild(this.wasteCard);
    
    const stockPileStartX = this.STOCK_X - (this.levelData.stockPile.length - 1) * 25; 
    this.levelData.stockPile.forEach((stockData, index) => {
      const card = new Card(stockData.suit, stockData.rank);
      card.setFaceUp(false);
      card.position.set(stockPileStartX + (index * 25), this.STOCK_Y);
      card.on("pointerdown", () => this.drawStock());
      worldLayer.addChild(card);
      this.stockPile.push(card);
    });
    
    this.updateStockInteractivity();
  }
  
  private updateStockInteractivity() {
    for (let i = 0; i < this.stockPile.length; i++) {
      const card = this.stockPile[i];
      const isTopCard = i === this.stockPile.length - 1;
      
      card.eventMode = isTopCard ? "static" : "none";
      card.cursor = isTopCard ? "pointer" : "default";
    }
  }
  
  private handleCardClick(clickedCard: Card) {
    if (!clickedCard.canPlayOn(this.wasteCard.rank)) {
      gsap.to(clickedCard, { x: clickedCard.x + 10, yoyo: true, repeat: 3, duration: 0.05 });
      return;
    }
    
    // 1. Calculate History for Undo
    const coveredCards = this.tableau.filter(c => c.coveredBy.includes(clickedCard));
    const flippedCards = coveredCards.filter(c => c.coveredBy.length === 1 && !c.isFaceUp);

    this.history.push({
      type: 'tableau',
      playedCard: clickedCard,
      previousWaste: this.wasteCard,
      flippedCards: flippedCards,
      coveredCards: coveredCards,
      originalX: clickedCard.x,
      originalY: clickedCard.y,
      originalAngle: clickedCard.angle
    });
    
    this.tableau = this.tableau.filter((c) => c !== clickedCard);
    this.updateWasteCard(clickedCard);
    
    // 2. Uncover cards beneath
    coveredCards.forEach((boardCard) => {
      boardCard.coveredBy = boardCard.coveredBy.filter(c => c !== clickedCard);
      if (boardCard.coveredBy.length === 0 && !boardCard.isFaceUp) {
        gsap.to(boardCard.scale, { x: 0, duration: 0.15, onComplete: () => {
          boardCard.setFaceUp(true);
          gsap.to(boardCard.scale, { x: 1, duration: 0.15 });
        }});
      }
    });

    this.hideTutorial();
    this.checkGameState();
  }
  
  private drawStock() {
    if (this.stockPile.length === 0) return;
    
    const drawnCard = this.stockPile.pop()!;
    
    // 1. Record History
    this.history.push({
      type: 'stock',
      playedCard: drawnCard,
      previousWaste: this.wasteCard,
      flippedCards: [],
      coveredCards: []
    });

    this.updateWasteCard(drawnCard);

    // 2. Shift all remaining stock cards to the right so the new top card sits at STOCK_X
    this.stockPile.forEach(card => {
      gsap.to(card, { x: "+=25", duration: 0.2, ease: "power1.out" });
    });

    this.stockText.text = `${this.stockPile.length}`;
    this.updateStockInteractivity(); 
    this.hideTutorial();
  }
  
  private updateWasteCard(newCard: Card) {
    this.wasteCard = newCard;
    this.getLayers().worldLayer.addChild(newCard);
    
    gsap.killTweensOf(newCard);
    gsap.to(newCard, {
      x: this.WASTE_X,
      y: this.WASTE_Y,
      angle: 0,
      duration: 0.4,
      ease: "power2.out",
      onStart: () => {
        newCard.setFaceUp(true);
        newCard.eventMode = "none"; 
      }
    });
  }

  // --- NEW: UNDO FEATURE ---
  private undoMove() {
    if (this.history.length === 0) return;
    
    // Deduct coins
    if (this.coins < 50) return; // Prevent undo if broke
    this.coins -= 50;
    this.coinText.text = `${this.coins}`;

    const last = this.history.pop()!;
    const cardToReturn = last.playedCard;

    // Restore the previous waste card to the top
    this.wasteCard = last.previousWaste;
    this.getLayers().worldLayer.addChild(this.wasteCard);

    if (last.type === 'stock') {
      // Put it back in the stock pile array
      this.stockPile.push(cardToReturn);
      this.getLayers().worldLayer.addChild(cardToReturn);

      // Shift other stock cards back left
      this.stockPile.forEach((card) => {
        if (card !== cardToReturn) {
          gsap.to(card, { x: "-=25", duration: 0.2, ease: "power1.out" });
        }
      });

      // Animate returning card back to top of stock
      gsap.killTweensOf(cardToReturn);
      gsap.to(cardToReturn, {
        x: this.STOCK_X, 
        y: this.STOCK_Y,
        angle: 0,
        duration: 0.3,
        onStart: () => cardToReturn.setFaceUp(false),
        onComplete: () => this.updateStockInteractivity()
      });

      this.stockText.text = `${this.stockPile.length}`;

    } else if (last.type === 'tableau') {
      // Put it back on the board array
      this.tableau.push(cardToReturn);
      this.getLayers().worldLayer.addChild(cardToReturn);

      // Flip any cards that were revealed back face-down
      last.flippedCards.forEach(c => c.setFaceUp(false));

      // Re-establish 'coveredBy' links
      last.coveredCards.forEach(c => c.coveredBy.push(cardToReturn));

      // Animate card back to the pyramid
      gsap.killTweensOf(cardToReturn);
      gsap.to(cardToReturn, {
        x: last.originalX,
        y: last.originalY,
        angle: last.originalAngle,
        duration: 0.3,
        onStart: () => {
          cardToReturn.eventMode = "static";
          cardToReturn.cursor = "pointer";
        }
      });
    }
  }
  
  private setupUI(uiLayer: Container) {
    this.stockText = new Text({ text: `${this.stockPile.length}`, style: { fill: 0xffffff, fontSize: 58,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 4 },
      dropShadow: { color: 0x000000, alpha: 0.5, blur: 2, distance: 2 }, } });
    this.stockText.anchor.set(0.5);
    this.stockText.position.set(this.STOCK_X , this.STOCK_Y );
    uiLayer.addChild(this.stockText);
    
    // --- Tutorial Bubble & Animated Parrot ---
    this.tutorialBubble = new Container();
    const bubbleBg = new Graphics().roundRect(0, 0, 600, 100, 16).fill({ color: 0x111827, alpha: 0.9 });
    this.tutorialText = new Text({ text: "", style: { fill: 0xffffff, fontSize: 24, wordWrap: true, wordWrapWidth: 560 } });
    this.tutorialText.position.set(20, 20);

    this.parrotSprite = Sprite.from("assets/images/parrot.png");
    this.parrotSprite.position.set(-140, -10); // Adjusted local pos
    this.parrotSprite.anchor.set(0.5);       // Anchor center for clean rotation
    // window.parrot = this.parrotSprite; // Expose for debugging
    
    this.tutorialBubble.addChild(bubbleBg, this.tutorialText, this.parrotSprite);
    this.tutorialBubble.position.set(this.context.DESIGN_W / 2 - 300, 550);
    this.tutorialBubble.alpha = 0;
    this.tutorialBubble.visible = false;
    uiLayer.addChild(this.tutorialBubble);

    const labelStyle = { fill: 0xffffff, fontSize: 20, fontWeight: "bold", dropShadow: { color: 0x000000, alpha: 0.5, blur: 2, distance: 2 } };

    const uiCoinBg = Sprite.from('assets/images/uiCoin.png');
    uiCoinBg.anchor.set(0.5);
    uiCoinBg.position.set(200, 100);
    uiLayer.addChild(uiCoinBg);
    
    // Track coinText reference so we can update it on Undo
    this.coinText = this.addLabel(uiCoinBg, `${this.coins}`, { ...labelStyle, fontSize: 34 }, 30, -5);

    const uiSteak = Sprite.from('assets/images/uiSteak.png');
    uiSteak.anchor.set(0.5);
    uiSteak.position.set(1600, 100);
    uiLayer.addChild(uiSteak);
    
    const uiSetting = Sprite.from('assets/images/uiSetting.png');
    uiSetting.anchor.set(0.5);
    uiSetting.position.set(130, 950);
    uiLayer.addChild(uiSetting);
    this.makeInteractive(uiSetting, () => console.log("Settings Clicked"));

    // --- Wire up Undo Button ---
    const uiBack = Sprite.from('assets/images/uiBack.png');
    uiBack.anchor.set(0.5);
    uiBack.position.set(1300, 900);
    uiLayer.addChild(uiBack);
    this.makeInteractive(uiBack, () => this.undoMove());
  }
  
  private showTutorial(message: string) {
    this.tutorialText.text = message;
    this.tutorialBubble.visible = true;
    this.tutorialBubble.y = 800; // Start low for pop-up effect
    
    // Apparition animation
    gsap.to(this.tutorialBubble, {
      alpha: 1,
      y: 550,
      duration: 0.5,
      ease: "back.out(1.2)"
    });

    // Parrot Jiggle
    gsap.killTweensOf(this.parrotSprite);
    // this.parrotSprite.rotation = -0.1;
    this.parrotSprite.y = 10;
    gsap.to(this.parrotSprite, {
      y: -30,
      yoyo: true,
      repeat: -1,
      duration: 1,
      ease: "sine.inOut"
    });
  }

  private hideTutorial() {
    if (!this.tutorialBubble.visible) return;
    
    // Fade out and sink down
    gsap.to(this.tutorialBubble, {
      alpha: 0,
      y: "+=50",
      duration: 0.3,
      onComplete: () => {
        this.tutorialBubble.visible = false;
        gsap.killTweensOf(this.parrotSprite); // Stop jiggling to save resources
      }
    });
  }

  private checkGameState() {
    if (this.tableau.length === 0) {
      // LEVEL COMPLETE: Update and save progress
      if (this.context.progress) {
        // Increment the level
        const current = this.context.progress.currentLevel || 1;
        this.context.progress.currentLevel = current + 1;
        
        // Save to local storage or backend (assuming context has a save method)
        if (typeof this.context.saveProgress === 'function') {
          this.context.saveProgress();
        }
      }
      // setTimeout(() => this.changeScene(new CompleteScene(this.context)), 500);
      this.triggerWinEffect();
      return;
    }
    
    // const hasMoves = this.tableau.some((c) => c.canPlayOn(this.wasteCard.rank));
    const hasMoves = this.tableau.some((c) => {
      if (c.coveredBy.length > 0) return false; // Not playable if covered
      
      const diff = Math.abs(c.rank - this.wasteCard.rank);
      return diff === 1 || diff === 12; 
    });
    if (!hasMoves) {
      this.showTutorial("No moves left? Tap the DRAW pile to get a new card.");
    }
  }

  private triggerWinEffect() {
    const layers = this.getLayers();
    // 1. Block UI interactions so user doesn't double-click during confetti
    layers.uiLayer.eventMode = 'none';
    layers.worldLayer.eventMode = 'none';

    const winContainer = new Container();
    layers.uiLayer.addChild(winContainer);

    const dimOverlay = new Graphics().rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H).fill({ color: 0x000000, alpha: 0.6 });
    dimOverlay.alpha = 0;
    winContainer.addChild(dimOverlay);
    gsap.to(dimOverlay, { alpha: 1, duration: 0.5 });

    // Victory Text
    const text = new Text({ 
      text: "You won!", 
      style: { fill: 0xffd700, fontSize: 120, fontWeight: "bold", stroke: { color: 0x000000, width: 8 }, dropShadow: { color: 0x000000, blur: 15, distance: 5, alpha: 0.8 } }
    });
    text.anchor.set(0.5);
    text.position.set(this.context.DESIGN_W / 2, this.context.DESIGN_H / 2 - 100);
    text.scale.set(0); 
    text.zIndex = 10; // Ensure it's above the confetti
    winContainer.addChild(text);
    
    gsap.to(text.scale, { x: 1, y: 1, duration: 1, ease: "elastic.out(1, 0.4)", delay: 0.2 });
    this.context.audio.playSfx("sfx_complete");

    // Confetti Logic
    const numCoins = 60;
    const centerX = this.context.DESIGN_W / 2;
    const startY = this.context.DESIGN_H + 100; 

    for (let i = 0; i < numCoins; i++) {
      const coin = Sprite.from("assets/images/coin.png"); 
      coin.anchor.set(0.5);
      coin.position.set(centerX, startY);
      const baseScale = 0.5 + Math.random() * 0.5;
      coin.scale.set(baseScale);
      winContainer.addChild(coin);

      const duration = 1.5 + Math.random() * 1.5; 
      const targetX = centerX + (Math.random() - 0.5) * 1400; 
      const peakY = startY - 700 - Math.random() * 500; 
      const delay = Math.random() * 1.5; 
      const spinAmount = (Math.random() - 0.5) * Math.PI * 15; 

      gsap.to(coin, { x: targetX, rotation: spinAmount, duration: duration, ease: "power1.out", delay: delay });
      const yTimeline = gsap.timeline({ delay: delay });
      yTimeline
        .to(coin, { y: peakY, duration: duration * 0.4, ease: "power2.out" })
        .to(coin, { y: startY + 200, duration: duration * 0.6, ease: "power1.in" });

      if (i % 10 === 0) setTimeout(() => this.context.audio.playSfx("sfx_coin"), delay * 1000);
    }

    // --- NEW TRANSITION TIMING ---
    // After 3.5 seconds, fade out the giant text and show the dialog
    setTimeout(() => {
      gsap.to(text, { alpha: 0, y: "-=100", duration: 0.5 });
      
      // CRITICAL: Re-enable the UI layer so the dialog button can be clicked!
      layers.uiLayer.eventMode = 'auto'; 
      
      this.triggerWinDialog();
    }, 3500); 
  }

  private triggerWinDialog() {
       this.dialogManager.showLevelComplete(
        this.getLayers().uiLayer,
        this.context.progress?.currentLevel || 1, 
        1200,                                     
        5,                           
        100,                                      
        () => {
          this.changeScene(new MenuScene(this.context));
        }
      );
  }

  private triggerWinEffect2() {
    // 1. Block UI interactions
    const layers = this.getLayers();
    layers.uiLayer.eventMode = 'none';
    layers.worldLayer.eventMode = 'none';

    const winContainer = new Container();
    layers.uiLayer.addChild(winContainer);

    // 2. Dim background
    const dimOverlay = new Graphics().rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H).fill({ color: 0x000000, alpha: 0.6 });
    dimOverlay.alpha = 0;
    winContainer.addChild(dimOverlay);
    gsap.to(dimOverlay, { alpha: 1, duration: 0.5 });

    // 3. Victory Text Animation
    const text = new Text({ 
      text: "LEVEL CLEARED!", 
      style: { 
        fill: 0xffd700, 
        fontSize: 120, 
        fontWeight: "bold", 
        stroke: { color: 0x000000, width: 8 },
        dropShadow: { color: 0x000000, blur: 15, distance: 5, alpha: 0.8 } 
      }
    });
    text.anchor.set(0.5);
    text.position.set(this.context.DESIGN_W / 2, this.context.DESIGN_H / 2 - 100);
    text.scale.set(0); 
    winContainer.addChild(text);
    
    gsap.to(text.scale, { x: 1, y: 1, duration: 1, ease: "elastic.out(1, 0.4)", delay: 0.2 });
    this.context.audio.playSfx("sfx_complete");

    // 4. The 2D Coin Confetti Logic
    const numCoins = 60;
    const centerX = this.context.DESIGN_W / 2;
    const startY = this.context.DESIGN_H + 100; // Start slightly off-screen at the bottom

    for (let i = 0; i < numCoins; i++) {
      const coin = Sprite.from("assets/images/coin.png"); 
      coin.anchor.set(0.5);
      coin.position.set(centerX, startY);
      
      const baseScale = 0.5 + Math.random() * 0.5;
      coin.scale.set(baseScale);
      winContainer.addChild(coin);

      // Physics variables
      const duration = 1.5 + Math.random() * 1.5; 
      const targetX = centerX + (Math.random() - 0.5) * 1400; 
      const peakY = startY - 700 - Math.random() * 500; 
      const delay = Math.random() * 1.5; 
      
      // Randomize the spin amount (some spin fast, some slow, different directions)
      const spinAmount = (Math.random() - 0.5) * Math.PI * 15; 

      // A. Horizontal Drift & 2D Spin
      // Using power1.out simulates air resistance slowing them down horizontally
      gsap.to(coin, {
        x: targetX,
        rotation: spinAmount,
        duration: duration,
        ease: "power1.out",
        delay: delay
      });

      // B. Vertical Movement (The Arc)
      // Shoots up quickly (power2.out), falls down steadily (power1.in)
      const yTimeline = gsap.timeline({ delay: delay });
      yTimeline
        .to(coin, { y: peakY, duration: duration * 0.4, ease: "power2.out" })
        .to(coin, { y: startY + 200, duration: duration * 0.6, ease: "power1.in" });

      // C. Audio sync
      if (i % 10 === 0) {
        setTimeout(() => this.context.audio.playSfx("sfx_coin"), delay * 1000);
      }
    }

    // 5. Change Scene
    setTimeout(() => {
      // this.changeScene(new CompleteScene(this.context));
      this.triggerWinDialog();
    }, 4500); // Slightly longer timeout to let the confetti fall
  }

  private triggerWinDialog2() {

       this.dialogManager.showLevelComplete(
        this.getLayers().uiLayer,
        this.context.progress?.currentLevel || 1, // Current Level
        1200,                                     // Base Score
        5,                           // Remaining Stack
        100,                                      // Value per remaining card
        () => {
          // What happens when they click "Continue" on the modal
          this.changeScene(new MenuScene(this.context));
          console.log("Going back to menu!");
        }
      );
    }

  private triggerWinEffect2() {
    // 1. Block UI interactions so the user can't click while the animation plays
    const layers = this.getLayers();
    layers.uiLayer.eventMode = 'none';
    layers.worldLayer.eventMode = 'none';

    // Create a dedicated container for the win effect
    const winContainer = new Container();
    layers.uiLayer.addChild(winContainer);

    // 2. Dim background to make the coins and text pop
    const dimOverlay = new Graphics().rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H).fill({ color: 0x000000, alpha: 0.6 });
    dimOverlay.alpha = 0;
    winContainer.addChild(dimOverlay);
    gsap.to(dimOverlay, { alpha: 1, duration: 0.5 });

    // 3. Victory Text Animation
    const text = new Text({ 
      text: "LEVEL CLEARED!", 
      style: { 
        fill: 0xffd700, 
        fontSize: 120, 
        fontWeight: "bold", 
        stroke: { color: 0x000000, width: 8 },
        dropShadow: { color: 0x000000, blur: 15, distance: 5, alpha: 0.8 } 
      }
    });
    text.anchor.set(0.5);
    text.position.set(this.context.DESIGN_W / 2, this.context.DESIGN_H / 2 - 100);
    text.scale.set(0); // Start tiny
    winContainer.addChild(text);
    
    // Bouncy pop-in effect
    gsap.to(text.scale, { x: 1, y: 1, duration: 1, ease: "elastic.out(1, 0.4)", delay: 0.2 });
    // this.context.audio.playSound("sfx_complete");
    this.context.audio.playSfx("sfx_complete");

    // 4. The Coin Fountain Logic
    const numCoins = 60;
    const centerX = this.context.DESIGN_W / 2;
    const startY = this.context.DESIGN_H + 100; // Start slightly off-screen at the bottom

    for (let i = 0; i < numCoins; i++) {
      const coin = Sprite.from("assets/images/coin.png"); // Use your actual loaded texture name
      coin.anchor.set(0.5);
      coin.position.set(centerX, startY);
      
      // Randomize sizes slightly for depth
      const baseScale = 0.5 + Math.random() * 0.5;
      coin.scale.set(baseScale);
      winContainer.addChild(coin);

      // Physics variables
      const duration = 1.5 + Math.random() * 1.5; // How long the coin lives
      const targetX = centerX + (Math.random() - 0.5) * 1400; // Wide horizontal spread
      const peakY = startY - 700 - Math.random() * 500; // How high it explodes
      const delay = Math.random() * 1.5; // Stagger spawns so it looks like a continuous burst

      // A. Fake 3D Flipping Effect (Scales X back and forth rapidly)
      gsap.to(coin.scale, {
        x: -baseScale, // Flip it
        duration: 0.1 + Math.random() * 0.1,
        yoyo: true,
        repeat: -1,
        ease: "none"
      });

      // B. Horizontal Movement (Linear steady drift)
      gsap.to(coin, {
        x: targetX,
        rotation: (Math.random() - 0.5) * Math.PI * 4,
        duration: duration,
        ease: "linear",
        delay: delay
      });

      // C. Vertical Movement (The Arc: explodes UP fast, falls DOWN fast)
      const yTimeline = gsap.timeline({ delay: delay });
      yTimeline
        .to(coin, { y: peakY, duration: duration / 2, ease: "power2.out" })
        .to(coin, { y: startY + 200, duration: duration / 2, ease: "power2.in" });

      // D. Play a subtle coin clink for the first few coins
      if (i % 10 === 0) {
        setTimeout(() => this.context.audio.playSfx("sfx_coin"), delay * 1000);
      }
    }

    // 5. Change to CompleteScene after the animation finishes (e.g., 4 seconds)
    setTimeout(() => {
      this.changeScene(new CompleteScene(this.context));
    }, 4000);
  }
  
  update(dt: number) {}
}