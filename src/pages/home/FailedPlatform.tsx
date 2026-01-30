import React from 'react';
import { motion } from 'framer-motion';

const FailedPlatform: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="fixed inset-0 z-[99999] bg-black"
        />
    );
};

export default FailedPlatform;
