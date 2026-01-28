import { useEffect } from "react";
import HomePage from "./HomePage";
import StarField from "../../components/canvas/StarField";

/**
 * A wrapper around the HomePage that forces all images to look "broken"
 * by strictly using the HTML native broken image behavior.
 */
export default function BrokenHomePage() {
    useEffect(() => {
        // Function to break all images in the container
        const breakImages = () => {
            const container = document.getElementById("broken-page-root");
            if (!container) return;

            // 1. Break standard <img> tags
            const images = container.querySelectorAll("img");
            images.forEach((img) => {
                // We set src to a guaranteed invalid URL to trigger the native broken image icon.
                // We also clear srcset to prevent the browser from finding a valid source.
                if (img.src !== "http://0.0.0.0/broken") {
                    img.src = "http://0.0.0.0/broken"; // Invalid host/path
                    img.srcset = "";
                    img.loading = "eager"; // Force it to try loading immediately
                }
            });

            // 2. For elements with background images, we can't easily show the "broken icon" naturally
            // without replacing the element. However, per user request to start, we focus on native behavior.
            // If we want to simulate it for backgrounds, we would need to replace them with <img> tags or use CSS content.
            // For now, let's try the CSS content override for known image containers to force the icon,
            // accepting that it might hide text content (which mimics a "broken" render where layout might fail).

            // Target specific containers known to be just images or banners
            // We break the string to prevent Tailwind's scanner from picking up "bg-[url(" as a class candidate
            const bgSelector = '[class*="bg-"][class*="url"]';
            const bgImageNodes = container.querySelectorAll(bgSelector);
            bgImageNodes.forEach(() => {
                // Force it to be an img-like element with invalid content
                // accessing 'style' to output css content isn't directly possible via JS style property easily for 'content'.
                // So we'll use a class or just leave the strict <img> targeting for now unless requested.
            });
        };

        // Run initially and periodically (to catch lazy loaded or new images)
        breakImages();
        const interval = setInterval(breakImages, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div id="broken-page-root" className="w-full h-full relative">
            {/* 
            Use the Particle Field from Now Playing page as requested.
            It handles its own canvas and animation.
            Scaled up for visibility as requested.
           */}
            <StarField particleScale={3} />

            {/* Vignette overlay for Foggy look (lighter grey mist at edges) */}
            <div className="fixed inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(30,32,36,0.8)_100%)] mix-blend-multiply" />
            {/* 
            We use a global style to ensure even newly mounted images are hit 
        */}
            <style>{`


        /* Force entire page background to Foggy Dark Gray */
        body, #root, #broken-page-root {
          background-color: #1a1c20 !important; /* Foggy Dark Gray */
          background: radial-gradient(circle at center, #2a2d35 0%, #1a1c20 100%) !important;
          color: #d1d5db !important;
        }
        
        /* Force Sidebar, Header, Key Layout Elements to match */
        aside, header, nav, main, section, footer {
            background-color: #1a1c20 !important;
            background: rgba(26, 28, 32, 0.95) !important;
            border-color: #374151 !important; 
        }
        
        /* Inputs, Buttons, Search Bars */
        input, button, select, textarea {
            background-color: #25282f !important;
            color: #e5e7eb !important;
            border: 1px solid #4b5563 !important;
        }
        
        /* Custom Scrollbars to match theme */
        ::-webkit-scrollbar {
            width: 10px;
            background: #1a1c20;
        }
        ::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 5px;
        }
        ::-webkit-scrollbar-corner {
            background: #1a1c20;
        }
        
        /* Selection Highlight */
        ::selection {
            background: #4b5563;
            color: #fff;
        }
        
        /* Update overrides for common bg classes to the new grey */
        [class*="bg-white"], [class*="bg-gray"], [class*="bg-slate"], [class*="bg-zinc"], [class*="bg-neutral"] {
            background-color: #1a1c20 !important;
        }
        
        /* Broken Image Placeholders */
        img, 
        [class*="bg-"][class*="url"],
        aside [class*="w-12"][class*="h-12"],
        aside [class*="w-12"][class*="h-12"] * {
           content: url("http://0.0.0.0/native-break-trigger") !important;
           display: flex !important;
           align-items: center;
           justify-content: center;
           background-color: #2a2d35 !important; 
           border: 1px solid #4b5563 !important; 
           filter: grayscale(100%) contrast(0.8) !important;
           object-fit: scale-down !important;
        }
        
        /* Break SVGs in sidebar (Commonly icons) if they want "image-like" things broken */
        aside svg {
           opacity: 0.3 !important; 
        }

        /* =========================================
           STATIC BROKEN LAYOUT (No dizzy motion)
           ========================================= */

        /* 1. Structural Damage (Static Skew/Rotation) */
        aside {
            transform: skewY(-2deg) rotate(-1deg) translateY(20px) !important;
            border-right: 5px solid #222 !important;
            filter: grayscale(100%) contrast(1.2);
            /* Make it look physically detached */
            box-shadow: 10px 0 20px rgba(0,0,0,0.8);
        }

        header {
            transform: rotate(1deg) translateY(-5px) !important;
            opacity: 0.8 !important;
        }

        main {
            /* Main content looks slightly caved in */
            transform: perspective(1000px) rotateX(1deg) scale(0.98) !important;
            filter: contrast(1.1);
        }

        /* 2. Text Decay (Static) */
        h1, h2, h3 {
            /* Headings look "smashed" */
            letter-spacing: -2px !important;
            transform: scaleY(0.9) skewX(-10deg) !important;
            opacity: 0.7 !important;
            color: #888 !important;
        }

        /* Randomly shift paragraphs slightly for "misalignment" feel */
        p, span, div, li, a {
             /* We can't random in CSS, but we can set a default "off" look for specific containers if we want. */
        }

        /* =========================================
           CHAOTIC TYPESETTING (Random static misalignment)
           ========================================= */
           
        /* Apply random-looking transforms to elements based on their position/order */
        p:nth-child(odd), li:nth-child(odd), span:nth-child(3n) {
            transform: rotate(2deg) translateX(15px) translateY(5px); /* Much larger shift */
            opacity: 0.9;
        }
        
        p:nth-child(even), li:nth-child(even), span:nth-child(4n) {
             transform: rotate(-3deg) translateX(-15px) translateY(-5px);
             letter-spacing: 2px;
        }
        
        /* More aggressive displacements for specific elements to look "broken" */
        *:nth-child(5n) {
             transform: skewX(15deg) translateY(20px) translateX(-10px) !important;
        }
        
        *:nth-child(7n) {
             transform: skewX(-10deg) translateY(-20px) translateX(30px) !important;
             color: #aaa !important; /* Faded text */
        }
        
        /* Make some text look "dropped" or scattered far away */
        *:nth-child(9n) {
             transform: translateY(40px) translateX(-40px) rotate(5deg) !important;
        }
        
        /* Complete disarray for some elements */
        *:nth-child(11n) {
             position: relative;
             left: 50px;
             top: 20px;
             transform: rotate(180deg); /* Upside down */
        }

        /* =========================================
           CONTAINER SCATTERING (Cards & Rows)
           ========================================= */

        /* Target the main cards (Banners, Charts) usually identified by their large border-radius */
        div[class*="rounded-[32px]"] {
            transform: rotate(-2deg) translateX(-20px) skewY(1deg) !important;
            background-color: #2a2d35 !important; /* Force Foggy Gray here too */
            background: linear-gradient(135deg, #2a2d35 0%, #23252b 100%) !important; /* Slight gradient for depth */
            border: 2px solid #4b5563 !important; /* Lighter border */
            box-shadow: 15px 15px 0px #111 !important; /* Keep the hard shadow, maybe lighten slightly? #1a1c20 */
            margin-bottom: 50px !important; 
            width: 95% !important; 
        }
        
        /* Scatter the Chart Rows specifically */
        div[class*="grid-cols-"]:nth-child(odd) {
             transform: translateX(40px) rotate(1deg) !important;
             background-color: #2a2d35 !important;   /* Changed from #080808 to Foggy Gray */
             border: 1px dashed #4b5563 !important;
        }
        
        div[class*="grid-cols-"]:nth-child(even) {
             transform: translateX(-40px) rotate(-2deg) !important;
             background-color: #23252b !important; /* Slightly darker foggy gray */
             border-left: 5px solid red !important;
        }
        
        /* The Artist Circles (Top area) */
        div[class*="rounded-full"] {
             transform: scale(1.2) translate(10px, -10px) !important;
             border: 1px dotted #6b7280 !important;
             background-color: #2a2d35 !important;
        }

        /* 3. Interactive Glitch (Only on Hover - Subtle) */
        a:hover, button:hover, div[class*="grid-cols-"]:hover {
             transform: translate(-5px, 5px) scale(1.02) !important;
             color: red !important;
             text-decoration: line-through !important;
             letter-spacing: 5px !important; /* Explode text on hover */
             z-index: 100 !important;
             background-color: #2a0000 !important; /* Deep red on hover ok */
        }
      `}</style>
            <HomePage />
        </div>
    );
}
