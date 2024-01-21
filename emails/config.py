from pathlib import Path
from dotenv import load_dotenv
import logging
import os
load_dotenv()
ROOT_DIR = Path(__file__).parent.parent
LOG_DIR = ROOT_DIR/'data/logs/'

if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

def create_logger(name, level = 'INFO', file = None):
    logger = logging.getLogger(name)
    logger.propagate = False
    logger.setLevel(level)
    if sum([isinstance(handler, logging.StreamHandler) for handler in logger.handlers]) == 0:
        ch = logging.StreamHandler()
        ch.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        logger.addHandler(ch)
    if file is not None:
        if sum([isinstance(handler, logging.FileHandler) for handler in logger.handlers]) == 0:
            ch = logging.FileHandler(LOG_DIR/file, 'w')
            ch.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
            logger.addHandler(ch)
            
    return logger