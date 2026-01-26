import { getTagGraph, type TagGraphItem } from "../api/music";

export interface VibeConfig {
    /** Animation Speed (seconds per cycle) - Lower is faster */
    speed: number;
    /** Scale/Intensity factor */
    intensity: number;
    /** Mood classification for debugging/future use */
    mood: 'energetic' | 'calm' | 'neutral';
}

const DEFAULT_VIBE: VibeConfig = {
    speed: 10,
    intensity: 1.0,
    mood: 'neutral'
};

// Tags indicating fast/energetic music
const FAST_TAGS = ['fast', 'energetic', 'upbeat', 'party', 'action', 'rock', 'metal', 'dance', 'edm', 'heavy', 'powerful', 'intense'];
// Tags indicating slow/calm music
const SLOW_TAGS = ['slow', 'calm', 'ballad', 'relaxing', 'meditative', 'sleep', 'ambient', 'sad', 'soft', 'melancholic', 'dream'];

/**
 * Analyzes the tags of a track to determine its visual "vibe" (speed, intensity).
 */
export async function getTrackVibe(musicId: number): Promise<VibeConfig> {
    try {
        const tags = await getTagGraph(musicId);
        return analyzeTags(tags);
    } catch (e) {
        console.error("Failed to analyze vibe", e);
        return DEFAULT_VIBE;
    }
}

export function analyzeTags(tags: TagGraphItem[]): VibeConfig {
    if (!tags || tags.length === 0) return DEFAULT_VIBE;

    let score = 0; // Positive = Fast, Negative = Slow

    tags.forEach(t => {
        const name = t.name.toLowerCase();

        if (FAST_TAGS.some(ft => name.includes(ft))) score += 2;
        if (SLOW_TAGS.some(st => name.includes(st))) score -= 2;
    });

    // Default settings (Enhanced for visibility)
    let speed = 10;
    let intensity = 1.0;
    let mood: VibeConfig['mood'] = 'neutral';

    if (score > 1) {
        // Energetic
        speed = 5; // Very fast rotation
        intensity = 1.3;
        mood = 'energetic';
    } else if (score < -1) {
        // Calm
        speed = 20; // Relaxed but still moving (was 25)
        intensity = 1.05;
        mood = 'calm';
    }

    return { speed, intensity, mood };
}
