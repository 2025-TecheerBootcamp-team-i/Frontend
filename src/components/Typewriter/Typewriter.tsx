import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { TypewriterConfig } from './types';

interface TypewriterProps {
  text: string;
  config: TypewriterConfig;
  triggerReplay: number; // Increment to force replay
}

export const Typewriter: React.FC<TypewriterProps> = ({ text, config, triggerReplay }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const previousTextRef = useRef('');
  
  // To handle the timeout refs for cleanup
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    console.log('[Typewriter] Effect triggered', {
      text: text,
      textLength: text.length,
      previousText: previousTextRef.current,
      previousLength: previousTextRef.current.length,
      triggerReplay: triggerReplay,
      displayedText: displayedText
    });

    // triggerReplay가 변경되면 전체 재생 (수동 재생용)
    if (triggerReplay > 0) {
      console.log('[Typewriter] 🔄 Full replay triggered');
      clearAllTimeouts();
      setDisplayedText('');
      previousTextRef.current = '';
      setIsTyping(true);
      setShowCursor(true);

      let currentIndex = 0;
      const chars = text.split('');

      const typeNextChar = () => {
        if (currentIndex < chars.length) {
          const newText = text.slice(0, currentIndex + 1);
          setDisplayedText(newText);
          console.log('[Typewriter] Typing char:', {
            index: currentIndex,
            char: chars[currentIndex],
            displayedText: newText
          });
          currentIndex++;

          const randomVar = config.smoothness > 0 
            ? (Math.random() * config.speed * config.smoothness) 
            : 0;
          const nextDelay = config.speed + randomVar;

          const timeout = setTimeout(typeNextChar, nextDelay);
          timeoutsRef.current.push(timeout);
        } else {
          console.log('[Typewriter] ✅ Typing completed');
          setIsTyping(false);
          previousTextRef.current = text;
          if (config.loop) {
               const loopTimeout = setTimeout(() => {
                  setDisplayedText('');
                  previousTextRef.current = '';
                  currentIndex = 0;
                  setIsTyping(true);
                  typeNextChar();
               }, 2000);
               timeoutsRef.current.push(loopTimeout);
          }
        }
      };

      const startTimeout = setTimeout(typeNextChar, config.startDelay);
      timeoutsRef.current.push(startTimeout);

      return () => clearAllTimeouts();
    }

    // 초기 렌더링 시 텍스트가 있으면 즉시 표시
    if (previousTextRef.current === '' && text.length > 0) {
      console.log('[Typewriter] 🎬 Initial render with text, starting animation');
      previousTextRef.current = '';
      setIsTyping(true);
      setShowCursor(true);

      let currentIndex = 0;
      const chars = text.split('');

      const typeNextChar = () => {
        if (currentIndex < chars.length) {
          const newText = text.slice(0, currentIndex + 1);
          setDisplayedText(newText);
          console.log('[Typewriter] Typing char:', {
            index: currentIndex,
            char: chars[currentIndex],
            displayedText: newText
          });
          currentIndex++;

          const randomVar = config.smoothness > 0 
            ? (Math.random() * config.speed * config.smoothness) 
            : 0;
          const nextDelay = config.speed + randomVar;

          const timeout = setTimeout(typeNextChar, nextDelay);
          timeoutsRef.current.push(timeout);
        } else {
          console.log('[Typewriter] ✅ Initial typing completed');
          setIsTyping(false);
          previousTextRef.current = text;
        }
      };

      const startTimeout = setTimeout(typeNextChar, config.startDelay);
      timeoutsRef.current.push(startTimeout);

      return () => clearAllTimeouts();
    }

    // 텍스트가 같으면 아무것도 하지 않음
    if (text === previousTextRef.current) {
      console.log('[Typewriter] ⏸️ Text unchanged, skipping');
      return;
    }

    // 텍스트가 줄어들거나 내용이 변경된 경우 (삭제 또는 수정)
    if (text.length <= previousTextRef.current.length || 
        !text.startsWith(previousTextRef.current)) {
      console.log('[Typewriter] ✂️ Text deleted or modified, updating immediately', {
        before: previousTextRef.current,
        after: text,
        beforeLength: previousTextRef.current.length,
        afterLength: text.length
      });
      clearAllTimeouts();
      setDisplayedText(text);
      previousTextRef.current = text;
      setIsTyping(false);
      return;
    }

    // 새로 추가된 부분만 애니메이션
    const previousLength = previousTextRef.current.length;
    const newChars = text.slice(previousLength);
    
    if (newChars.length === 0) {
      console.log('[Typewriter] ⚠️ No new chars to animate', {
        text: text,
        previousText: previousTextRef.current
      });
      return;
    }

    console.log('[Typewriter] ✨ New chars detected, starting animation', {
      previousText: previousTextRef.current,
      newChars: newChars,
      newCharsLength: newChars.length
    });

    setIsTyping(true);
    setShowCursor(true);

    let currentIndex = 0;
    const chars = newChars.split('');

    const typeNextChar = () => {
      if (currentIndex < chars.length) {
        const newDisplayedText = previousTextRef.current + newChars.slice(0, currentIndex + 1);
        setDisplayedText(newDisplayedText);
        console.log('[Typewriter] Typing new char:', {
          index: currentIndex,
          char: chars[currentIndex],
          displayedText: newDisplayedText
        });
        currentIndex++;

        // Calculate delay: Base speed + random variation if smoothness > 0
        const randomVar = config.smoothness > 0 
          ? (Math.random() * config.speed * config.smoothness) 
          : 0;
        const nextDelay = config.speed + randomVar;

        const timeout = setTimeout(typeNextChar, nextDelay);
        timeoutsRef.current.push(timeout);
      } else {
        console.log('[Typewriter] ✅ New chars animation completed', {
          finalText: text
        });
        setIsTyping(false);
        previousTextRef.current = text;
      }
    };

    // Initial start delay
    const startTimeout = setTimeout(typeNextChar, config.startDelay);
    timeoutsRef.current.push(startTimeout);

    return () => clearAllTimeouts();
  }, [text, config.speed, config.startDelay, config.smoothness, config.loop, triggerReplay]);

  // Cursor Blinking Logic
  useEffect(() => {
    if (isTyping) {
        setShowCursor(true);
        return;
    }

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, config.cursorBlinkSpeed * 1000);

    return () => clearInterval(interval);
  }, [isTyping, config.cursorBlinkSpeed]);

  // 줄바꿈을 기준으로 텍스트 분리
  const lines = displayedText.split('\n');

  return (
    <div 
      className="relative font-sans text-4xl leading-relaxed text-[#f6f6f6] whitespace-pre-wrap break-words font-bold text-center w-full"
    >
      {lines.map((line, lineIndex) => (
        <motion.div
          key={lineIndex}
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: lineIndex * 0.1 }}
        >
          {line.split('').map((char, charIndex) => {
              const globalIndex = displayedText.split('\n').slice(0, lineIndex).join('\n').length + 
                              (lineIndex > 0 ? 1 : 0) + charIndex;
            return (
              <motion.span
                key={`${lineIndex}-${charIndex}`}
                initial={{ opacity: 0, y: 5, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {char}
              </motion.span>
            );
          })}
          {lineIndex === lines.length - 1 && (
            <motion.span
              animate={{ opacity: showCursor ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="inline-block text-[#f6f6f6] ml-2 align-baseline text-4xl font-bold"
              style={{ 
                color: '#f6f6f6',
                textShadow: '0 0 10px rgba(246, 246, 246, 0.5)'
              }}
            >
              {config.cursorChar}
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
};