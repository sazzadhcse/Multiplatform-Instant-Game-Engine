import { Container, Graphics, Sprite, Text, Assets } from "pixi.js";
import { gsap } from "gsap";
import type { MapSystem, MapZone } from "../entities/Maps";

export class DialogManager {
  private DESIGN_W = 1920; 
  private DESIGN_H = 1080;

  private fogMap: Map<string, Container> = new Map();

  /**
   * Helper to curve text along an invisible circle radius
   * Automatically calculates spacing based on text length.
   */
  private createArcText3(textStr: string, style: any, radius: number): Container {
    const container = new Container();
    const chars = textStr.split("");
    const letterSpacing = 1; // Adjust this to tighten/loosen letters

    // 1. Measure total width of the text
    let totalTextWidth = 0;
    const charObjs: { sprite: Text, width: number }[] = [];

    for (const char of chars) {
        const t = new Text({ text: char, style });
        t.anchor.set(0.5, 1); // Anchor at bottom-center of the letter
        const w = t.width + letterSpacing;
        charObjs.push({ sprite: t, width: w });
        totalTextWidth += w;
    }

    // 2. Calculate the total angle this text should consume (in radians)
    // Formula: Angle = ArcLength / Radius
    const totalAngle = totalTextWidth / radius; 
    const startAngle = -totalAngle / 2;

    let currentAngle = startAngle;

    // 3. Position characters
    for (const obj of charObjs) {
        // Center the character within its allocated angle slot
        const charAngleSpan = obj.width / radius;
        const theta = currentAngle + (charAngleSpan / 2);

        obj.sprite.x = Math.sin(theta) * radius;
        obj.sprite.y = radius - Math.cos(theta) * radius;
        obj.sprite.rotation = theta;

        container.addChild(obj.sprite);
        currentAngle += charAngleSpan;
    }

    return container;
  }

  /**
   * Helper to curve text along an invisible circle radius
   */
  private createArcText(textStr: string, style: any, radius: number, angleSpan: number): Container {
    const container = new Container();
    const chars = textStr.split("");
    const totalAngle = angleSpan * (Math.PI / 180); 
    const startAngle = -totalAngle / 2;

    const charSprites: Text[] = [];
    let totalWidth = 0;
    const letterSpacing = 2; 

    // Pass 1: Measure
    for (let i = 0; i < chars.length; i++) {
        const charText = new Text({ text: chars[i], style });
        charText.anchor.set(0.5, 1);
        charSprites.push(charText);
        totalWidth += charText.width + letterSpacing;
    }

    // Pass 2: Position
    let currentAccumulatedWidth = 0;
    for (let i = 0; i < charSprites.length; i++) {
        const charText = charSprites[i];
        const centerPos = currentAccumulatedWidth + (charText.width / 2);
        const theta = startAngle + (centerPos / totalWidth) * totalAngle;

        charText.x = Math.sin(theta) * radius;
        charText.y = radius - Math.cos(theta) * radius; 
        charText.rotation = theta;

        container.addChild(charText);
        currentAccumulatedWidth += charText.width + letterSpacing;
    }
    return container;
  }

  /**
   * Shared helper to close and destroy the dialog
   */
  private closeDialog(dialogContainer: Container, overlay: Graphics, onComplete?: () => void) {
      // Disable interaction immediately to prevent double-clicks
      overlay.eventMode = 'none';
      dialogContainer.eventMode = 'none';

      // Animate out (Drop down)
      gsap.to(dialogContainer, { y: this.DESIGN_H + 800, duration: 0.3, ease: "back.in(1.0)" });
      
      // Fade overlay
      gsap.to(overlay, { alpha: 0, duration: 0.3, onComplete: () => {
        overlay.destroy();
        dialogContainer.destroy();
        if (onComplete) onComplete();
      }});
  }

  /**
   * Base Dialog Generator with Click-Outside-To-Close
   */
  private createBaseDialog(parentLayer: Container, titleString: string, titleAngle: number, btnString: string, onBtnClick: () => void) {
    // 1. Infinite Overlay
    const overlay = new Graphics()
        .rect(-5000, -5000, 10000, 10000) 
        .fill({ color: 0x000000, alpha: 0.75 });
    
    overlay.eventMode = 'static'; 
    overlay.cursor = 'pointer'; // Show hand cursor to indicate it's clickable
    parentLayer.addChild(overlay);

    const dialogContainer = new Container();
    dialogContainer.x = this.DESIGN_W / 2;
    dialogContainer.y = this.DESIGN_H + 800; 
    parentLayer.addChild(dialogContainer);

    // 2. CLICK OUTSIDE LOGIC
    // When clicking overlay, we close the dialog BUT we do NOT call onBtnClick()
    overlay.on('pointerdown', () => {
        this.closeDialog(dialogContainer, overlay);
    });

    const bg = Sprite.from("assets/images/dialog.png");
    bg.anchor.set(0.5);
    dialogContainer.addChild(bg);

    // 3. New Arc Text Usage (Removed the hardcoded angle)
    const titleStyle = {
        fill: 0xffffff, fontSize: 52, fontWeight: "bold",
        stroke: { color: 0x990033, width: 6 },
        dropShadow: { color: 0x000000, alpha: 0.5, blur: 4, distance: 2 }
    };
    
    // Radius 1000 usually works well for a gentle curve
    const title = this.createArcText(titleString, titleStyle, 1000, titleAngle); // 30 degree arc span
    title.y = -bg.height / 2 + 80; 
    dialogContainer.addChild(title);

    // Action Button
    const btn = Sprite.from("assets/images/uiBtnBig.png");
    btn.anchor.set(0.5);
    btn.y = bg.height / 2 - 20; 
    dialogContainer.addChild(btn);

    const btnText = new Text({ text: btnString, style: { fill: 0xffffff, fontSize: 42, fontWeight: "bold", stroke: { color: 0x005500, width: 5 } }});
    btnText.anchor.set(0.5);
    btn.addChild(btnText);

    // Button Logic
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerover', () => btn.scale.set(1.05));
    btn.on('pointerout', () => btn.scale.set(1.0));
    btn.on('pointerdown', () => btn.scale.set(0.95));
    
    btn.on('pointerup', () => {
      btn.scale.set(1.05);
      // Close AND trigger the callback
      this.closeDialog(dialogContainer, overlay, onBtnClick);
    });

    // Intro Animation
    gsap.to(dialogContainer, { y: this.DESIGN_H / 2, duration: 0.6, ease: "back.out(1.2)" });

    return dialogContainer; 
  }

  /**
   * Base Dialog Generator
   */
  private createBaseDialog2(parentLayer: Container, titleString: string, btnString: string, onBtnClick: () => void) {
    // 1. INFINITE OVERLAY FIX
    // Instead of 0 to DESIGN_W, we draw a massive rectangle centered on the screen.
    // Since this is added to the UI layer (which is centered), this will extend 
    // outwards to cover any "letterboxing" or background areas.
    const overlay = new Graphics()
        .rect(-5000, -5000, 10000, 10000) 
        .fill({ color: 0x000000, alpha: 0.75 }); // Darker alpha (0.75) for better contrast
    
    overlay.eventMode = 'static'; 
    parentLayer.addChild(overlay);

    const dialogContainer = new Container();
    dialogContainer.x = this.DESIGN_W / 2;
    dialogContainer.y = this.DESIGN_H + 800; 
    parentLayer.addChild(dialogContainer);

    const bg = Sprite.from("assets/images/dialog.png");
    bg.anchor.set(0.5);
    dialogContainer.addChild(bg);

    // Curved Ribbon Title
    const titleStyle = {
        fill: 0xffffff, fontSize: 52, fontWeight: "bold",
        stroke: { color: 0x990033, width: 6 },
        dropShadow: { color: 0x000000, alpha: 0.5, blur: 4, distance: 2 }
    };
    
    // Adjust radius/angle to match your ribbon asset
    const title = this.createArcText(titleString, titleStyle, 1000, 23);
    title.y = -bg.height / 2 + 80; 
    dialogContainer.addChild(title);

    // Green Action Button
    const btn = Sprite.from("assets/images/uiBtnBig.png");
    btn.anchor.set(0.5);
    btn.y = bg.height / 2 - 20; 
    dialogContainer.addChild(btn);

    const btnText = new Text({ text: btnString, style: { fill: 0xffffff, fontSize: 42, fontWeight: "bold", stroke: { color: 0x005500, width: 5 } }});
    btnText.anchor.set(0.5);
    btn.addChild(btnText);

    // Button Logic
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerover', () => btn.scale.set(1.05));
    btn.on('pointerout', () => btn.scale.set(1.0));
    btn.on('pointerdown', () => btn.scale.set(0.95));
    btn.on('pointerup', () => {
      btn.scale.set(1.05);
      // Close Animation
      gsap.to(dialogContainer, { y: this.DESIGN_H + 800, duration: 0.4, ease: "back.in(1.2)" });
      gsap.to(overlay, { alpha: 0, duration: 0.4, onComplete: () => {
        overlay.destroy();
        dialogContainer.destroy();
        onBtnClick();
      }});
    });

    // Intro Animation
    gsap.to(dialogContainer, { y: this.DESIGN_H / 2, duration: 0.6, ease: "back.out(1.2)" });

    return dialogContainer; 
  }

  /**
   * LEVEL START MODAL (FURNISHED)
   */
  public showLevelStart(parentLayer: Container, level: number, cost: number, onPlay: () => void) {
    const dialog = this.createBaseDialog(parentLayer, `Level ${level}`, 12, "Play", onPlay);

    // --- 1. SILHOUETTE HATS (The Goal) ---
    // We use the same 'hat.png' but tinted black with low alpha to look like a "slot"
    // Clustered together like the reference image
    const hatY = -80; 
    
    // Left Hat (Tilted Left)
    const hatLeft = Sprite.from("assets/images/hat.png");
    hatLeft.anchor.set(0.5);
    hatLeft.position.set(-150, hatY + 10);
    hatLeft.angle = -15;
    hatLeft.scale.set(0.8);
    hatLeft.tint = 0x000000; // Black silhouette
    hatLeft.alpha = 0.3;     // Faded

    // Right Hat (Tilted Right)
    const hatRight = Sprite.from("assets/images/hat.png");
    hatRight.anchor.set(0.5);
    hatRight.position.set(150, hatY + 10);
    hatRight.angle = 15;
    hatRight.scale.set(0.8);
    hatRight.tint = 0x000000;
    hatRight.alpha = 0.3;

    // Center Hat (Big & Straight)
    const hatCenter = Sprite.from("assets/images/hat.png");
    hatCenter.anchor.set(0.5);
    hatCenter.position.set(0, hatY);
    hatCenter.scale.set(1.1); 
    hatCenter.tint = 0x000000;
    hatCenter.alpha = 0.35;

    dialog.addChild(hatLeft, hatRight, hatCenter);

    // --- 2. COST ROW (Centered) ---
    const rowContainer = new Container();
    rowContainer.y = 80; // Position below hats

    // "Cost" Label
    const costStyle = { fill: 0x4a2e15, fontSize: 40, fontWeight: "bold" };
    const costLabel = new Text({ text: "Cost", style: costStyle });
    costLabel.anchor.set(0, 0.5);
    costLabel.x = 0;

    // Coin Icon
    const coinIcon = Sprite.from("assets/images/coin.png");
    coinIcon.anchor.set(0, 0.5);
    coinIcon.scale.set(0.55);
    coinIcon.x = costLabel.width + 15;

    // Amount
    const costAmount = new Text({ text: `${cost}`, style: costStyle });
    costAmount.anchor.set(0, 0.5);
    costAmount.x = coinIcon.x + coinIcon.width + 15;

    rowContainer.addChild(costLabel, coinIcon, costAmount);

    // Center the entire row
    rowContainer.x = -rowContainer.width / 2;
    
    dialog.addChild(rowContainer);
  }

  /**
   * LEVEL COMPLETE MODAL
   */
  public showLevelComplete(parentLayer: Container, level: number, baseScore: number, stackCardsLeft: number, cardValue: number, onContinue: () => void) {
    const dialog = this.createBaseDialog(parentLayer, `Level ${level} Complete`, 23, "Continue", onContinue);

    const hatY = -120;
    const sideScale = 0.5;   
    const centerScale = 0.65; 
    
    // Empty Slots (Background)
    const leftSlot = Sprite.from("assets/images/hatSlot.png");
    leftSlot.anchor.set(0.5); leftSlot.position.set(-140, hatY + 15); leftSlot.angle = -15; leftSlot.scale.set(sideScale);
    
    const centerSlot = Sprite.from("assets/images/hatSlot.png");
    centerSlot.anchor.set(0.5); centerSlot.position.set(0, hatY); centerSlot.scale.set(centerScale);
    
    const rightSlot = Sprite.from("assets/images/hatSlot.png");
    rightSlot.anchor.set(0.5); rightSlot.position.set(140, hatY + 15); rightSlot.angle = 15; rightSlot.scale.set(sideScale);
    
    dialog.addChild(leftSlot, centerSlot, rightSlot);

    // Filled Hats (Animated)
    const hatLeft = Sprite.from("assets/images/hat.png");
    hatLeft.anchor.set(0.5); hatLeft.position.set(-140, hatY + 15); hatLeft.angle = -15; hatLeft.scale.set(0);

    const hatRight = Sprite.from("assets/images/hat.png");
    hatRight.anchor.set(0.5); hatRight.position.set(140, hatY + 15); hatRight.angle = 15; hatRight.scale.set(0);

    const hatCenter = Sprite.from("assets/images/hat.png");
    hatCenter.anchor.set(0.5); hatCenter.position.set(0, hatY); hatCenter.scale.set(0); 

    dialog.addChild(hatLeft, hatRight, hatCenter);

    // Pop-in Animation
    gsap.to(hatLeft.scale, { x: sideScale, y: sideScale, duration: 0.5, ease: "back.out(1.5)", delay: 0.5 });
    gsap.to(hatCenter.scale, { x: centerScale, y: centerScale, duration: 0.5, ease: "back.out(1.5)", delay: 0.7 });
    gsap.to(hatRight.scale, { x: sideScale, y: sideScale, duration: 0.5, ease: "back.out(1.5)", delay: 0.9 });

    // Stats Rows
    const textStyle = { fill: 0x4a2e15, fontSize: 40, fontWeight: "normal" };
    const boldStyle = { fill: 0x000000, fontSize: 50, fontWeight: "bold" };
    
    const createRow = (labelText: string, valText: string, yPos: number, isBold = false) => {
      const rowContainer = new Container();
      rowContainer.y = yPos;

      const label = new Text({ text: labelText, style: isBold ? boldStyle : textStyle });
      label.anchor.set(0, 0.5);
      label.x = 0; 

      const coin = Sprite.from("assets/images/coin.png");
      coin.anchor.set(0, 0.5);
      coin.scale.set(0.55); 
      coin.x = label.width + 15; 

      const value = new Text({ text: valText, style: isBold ? boldStyle : textStyle });
      value.anchor.set(0, 0.5);
      value.x = coin.x + coin.width + 15; 

      rowContainer.addChild(label, coin, value);
      rowContainer.x = -rowContainer.width / 2; // Center block

      dialog.addChild(rowContainer);
    };

    const remainingValue = stackCardsLeft * cardValue;
    const totalScore = baseScore + remainingValue;

    createRow("Level Cleared:", `${baseScore}`, -10);
    createRow(`Stack Cards (${stackCardsLeft}):`, `${remainingValue}`, 75); 
    
    const line = new Graphics().rect(-250, 130, 500, 3).fill({ color: 0x8c6d46, alpha: 0.5 });
    dialog.addChild(line);

    createRow("You Won: ", `${totalScore}`, 185, true); 
  }

  // ... (Map Exploration code remains the same as previous) ...
   public async showMapExploration(
        parentLayer: Container, 
        mapSystem: MapSystem, 
        playerCoins: number,
        onUnlock: (cost: number) => void
    ) {
        // Overlay for Map (Covering full screen)
        // const overlay = new Graphics().rect(-5000, -5000, 10000, 10000).fill({ color: 0x000000, alpha: 0.85 });
        // overlay.eventMode = 'static';
        // parentLayer.addChild(overlay);

    const dialog = this.createBaseDialog(parentLayer, `Map 1`, 8, "Play");

        // const mapContainer = new Container();
        // mapContainer.position.set(this.DESIGN_W / 2, this.DESIGN_H / 2);
        // parentLayer.addChild(mapContainer);

        const mapTexture = await Assets.load("assets/images/map1.png"); 
        const mapSprite = new Sprite(mapTexture);
        mapSprite.anchor.set(0.5);
        mapSprite.scale.set(0.75);
        dialog.addChild(mapSprite);

        this.fogMap.clear();

        mapSystem.zones.forEach((zone) => {
            if (!zone.isUnlocked) {
                const fogPiece = this.createFogPiece(zone, mapSprite.width, mapSprite.height);
                dialog.addChild(fogPiece);
                this.fogMap.set(zone.id, fogPiece);
            }
        });

        const nextZone = mapSystem.getNextLockedZone();
        
        if (nextZone) {
            this.createExplorationUI(parentLayer, nextZone, playerCoins, () => {
                if (playerCoins >= nextZone.cost) {
                    this.revealZone(nextZone.id, () => {
                        onUnlock(nextZone.cost);
                        setTimeout(() => {
                            // overlay.destroy();
                            // mapContainer.destroy();
                        }, 1000);
                    });
                } else {
                    console.log("Not enough coins!");
                }
            });
        } else {
            const completeText = new Text({ text: "MAP COMPLETED!", style: { fill: 0xffd700, fontSize: 60, fontWeight: 'bold' } });
            completeText.anchor.set(0.5);
            completeText.position.set(this.DESIGN_W/2, this.DESIGN_H - 100);
            parentLayer.addChild(completeText);
        }

        const closeBtn = new Text({ text: "X", style: { fill: 0xffffff, fontSize: 40 } });
        closeBtn.position.set(this.DESIGN_W - 50, 50);
        closeBtn.eventMode = 'static';
        closeBtn.cursor = 'pointer';
        closeBtn.on('pointerdown', () => {
            // overlay.destroy();
            // mapContainer.destroy();
        });
        parentLayer.addChild(closeBtn);
    }
    
    // ... Helper methods (createFogPiece, createExplorationUI, revealZone, getPolygonCenter) need to be included here as per previous messages
    // Assuming they are preserved or you need me to re-paste them?
    // I will include the critical helper "createFogPiece" just in case
    
    private createFogPiece(zone: MapZone, mapW: number, mapH: number): Container {
        const container = new Container();
        const fogGraphics = new Graphics().rect(-mapW / 2, -mapH / 2, mapW, mapH).fill({ color: 0x2e2e3a, alpha: 0.9 });
        
        const maskGraphics = new Graphics();
        const poly = zone.polygon;
        maskGraphics.moveTo(poly[0] - mapW/2, poly[1] - mapH/2);
        for (let i = 2; i < poly.length; i += 2) {
            maskGraphics.lineTo(poly[i] - mapW/2, poly[i+1] - mapH/2);
        }
        maskGraphics.closePath();
        maskGraphics.fill({ color: 0xffffff });

        fogGraphics.mask = maskGraphics;
        container.addChild(maskGraphics); 
        container.addChild(fogGraphics);

        const center = this.getPolygonCenter(poly);
        const lockIcon = Sprite.from("assets/images/uiBox.png"); 
        lockIcon.anchor.set(0.5);
        lockIcon.scale.set(0.5);
        lockIcon.position.set(center.x - mapW/2, center.y - mapH/2);
        lockIcon.alpha = 0.5;
        container.addChild(lockIcon);

        return container;
    }
    
    private createExplorationUI(parent: Container, zone: MapZone, currentCoins: number, onClick: () => void) {
        const btnContainer = new Container();
        btnContainer.position.set(this.DESIGN_W / 2, this.DESIGN_H - 150);
        parent.addChild(btnContainer);

        const btnBg = Sprite.from("assets/images/uiBtnBig.png");
        btnBg.anchor.set(0.5);
        btnContainer.addChild(btnBg);

        const btnText = new Text({
            text: `Explore ${zone.name}`,
            style: { fill: 0xffffff, fontSize: 32, fontWeight: 'bold' }
        });
        btnText.anchor.set(0.5);
        btnText.y = -20;
        btnContainer.addChild(btnText);

        const costStyle = { fill: currentCoins >= zone.cost ? 0xccffcc : 0xff9999, fontSize: 28, fontWeight: 'bold' };
        const costText = new Text({ text: `${zone.cost}`, style: costStyle });
        costText.anchor.set(0, 0.5);
        costText.position.set(10, 25);

        const coinIcon = Sprite.from("assets/images/coin.png");
        coinIcon.anchor.set(0.5);
        coinIcon.scale.set(0.4);
        coinIcon.position.set(-20, 25);
        
        btnContainer.addChild(coinIcon, costText);

        btnContainer.eventMode = 'static';
        btnContainer.cursor = 'pointer';
        btnContainer.on('pointerdown', () => btnContainer.scale.set(0.95));
        btnContainer.on('pointerup', () => {
            btnContainer.scale.set(1.0);
            onClick();
        });
    }

    private revealZone(zoneId: string, onComplete: () => void) {
        const fogPiece = this.fogMap.get(zoneId);
        if (fogPiece) {
            gsap.to(fogPiece, {
                alpha: 0,
                duration: 1.5,
                ease: "power2.inOut",
                onComplete: () => {
                    fogPiece.visible = false;
                    onComplete();
                }
            });
            gsap.to(fogPiece.scale, { x: 1.1, y: 1.1, duration: 1.5 });
        } else {
            onComplete();
        }
    }

    private getPolygonCenter(poly: number[]) {
        let x = 0, y = 0;
        for (let i = 0; i < poly.length; i += 2) {
            x += poly[i];
            y += poly[i + 1];
        }
        return { x: x / (poly.length / 2), y: y / (poly.length / 2) };
    }
}