import { motion, useInView, useAnimation, type Variants } from 'framer-motion';
import { useRef, useEffect, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  width?: 'fit-content' | '100%';
  delay?: number;
}

export const ScrollReveal = ({
  children,
  width = 'fit-content',
  delay = 0,
}: Props) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px 0px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  const variants: Variants = {
    hidden: { opacity: 0, y: 75 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div ref={ref} style={{ width, position: 'relative', overflow: 'hidden' }}>
      <motion.div
        variants={variants}
        initial="hidden"
        animate={controls}
        transition={{ duration: 0.5, delay: delay }}
      >
        {children}
      </motion.div>
    </div>
  );
};
