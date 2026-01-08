from paddleocr import PaddleOCR
import logging

logger = logging.getLogger("uvicorn")

class OCREngine:
    def __init__(self):
        logger.info("Loading PaddleOCR Model...")
        self.model = PaddleOCR(use_angle_cls=True, lang='en', enable_mkldnn=True) 
        logger.info("PaddleOCR loaded!")

    def extract_text(self, image, min_confidence=0.5):
        try:
            result = self.model.ocr(image)
            extracted_lines = []

            if not result or result[0] is None:
                return ""

            data = result[0]

            def filter_text(texts, scores):
                for text, score in zip(texts, scores):
                    if score > min_confidence:
                        extracted_lines.append(text)
                    else:
                        logger.info(f"Rejected '{text}' (Conf: {score:.2f} < {min_confidence})")

            if isinstance(data, dict):
                filter_text(data.get('rec_texts', []), data.get('rec_scores', []))
            
            elif isinstance(data, list):
                texts = [line[1][0] for line in data if len(line) >= 2]
                scores = [line[1][1] for line in data if len(line) >= 2]
                filter_text(texts, scores)

            return " ".join(extracted_lines)

        except Exception as e:
            logger.error(f"PaddleOCR Error: {e}")
            return ""

ocr_engine = OCREngine()