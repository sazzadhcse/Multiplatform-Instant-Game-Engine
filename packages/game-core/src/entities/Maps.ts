// src/logic/MapSystem.ts

export interface MapZone {
    id: string;
    name: string;
    cost: number;
    isUnlocked: boolean;
    // [x, y, x, y...] coordinates relative to the map image
    polygon: number[]; 
}

export class MapSystem {
    // 5 Zones mapped to your specific image layout
    public zones: MapZone[] = [
        { 
            id: 'island_top_left', 
            name: 'Black Island', 
            cost: 200, 
            isUnlocked: false, // Change to true if testing
            // Top Left Island area
            polygon: [50,50, 450,50, 500,400, 200,550, 50,450] 
        },
        { 
            id: 'mountains_center', 
            name: 'The Mountains', 
            cost: 500, 
            isUnlocked: false,
            // Central mountainous region
            polygon: [450,50, 1000,50, 1100,500, 700,700, 500,400] 
        },
        { 
            id: 'temple_bottom', 
            name: 'Ancient Temple', 
            cost: 800, 
            isUnlocked: false,
            // Bottom center temple area
            polygon: [200,550, 700,700, 1200,600, 1100,950, 300,950] 
        },
        { 
            id: 'treasure_top_right', 
            name: 'Treasure Coast', 
            cost: 1000, 
            isUnlocked: false,
            // Top Right area with the chest
            polygon: [1000,50, 1850,50, 1850,500, 1100,500] 
        },
        { 
            id: 'pirate_bottom_right', 
            name: 'Skull Cove', 
            cost: 1500, 
            isUnlocked: false,
            // Bottom Right area with the skull
            polygon: [1200,600, 1850,500, 1850,950, 1100,950] 
        }
    ];

    public getNextLockedZone(): MapZone | null {
        return this.zones.find(z => !z.isUnlocked) || null;
    }

    public unlockZone(zoneId: string): boolean {
        const zone = this.zones.find(z => z.id === zoneId);
        if (zone) {
            zone.isUnlocked = true;
            return true;
        }
        return false;
    }
}