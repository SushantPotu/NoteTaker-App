import numpy as np
# pyrefly: ignore [missing-import]
import cv2
import logging

logger = logging.getLogger("uvicorn")

def adjust_gamma(image, gamma=1.0):
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(image, table)

def process_drawing_pipeline(image_bytes):
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        
        if len(image.shape) == 3 and image.shape[2] == 4:
            b, g, r, a = cv2.split(image)
            white_bg = np.ones_like(b) * 255
            alpha_factor = a.astype(float) / 255.0
            new_b = (b.astype(float) * alpha_factor + white_bg.astype(float) * (1 - alpha_factor)).astype(np.uint8)
            new_g = (g.astype(float) * alpha_factor + white_bg.astype(float) * (1 - alpha_factor)).astype(np.uint8)
            new_r = (r.astype(float) * alpha_factor + white_bg.astype(float) * (1 - alpha_factor)).astype(np.uint8)
            image = cv2.merge([new_b, new_g, new_r])

        # Auto-crop white borders around digital drawing
        gray_for_crop = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresh_crop = cv2.threshold(gray_for_crop, 240, 255, cv2.THRESH_BINARY_INV)
        pts = cv2.findNonZero(thresh_crop)
        if pts is not None:
            x, y, w, h = cv2.boundingRect(pts)
            # Pad by 30px
            pad = 30
            h_orig, w_orig = image.shape[:2]
            y1 = max(0, y - pad)
            y2 = min(h_orig, y + h + pad)
            x1 = max(0, x - pad)
            x2 = min(w_orig, x + w + pad)
            image = image[y1:y2, x1:x2]
            logger.info(f"Auto-cropped drawing content: shape changed to {image.shape}")

        gray_check = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if np.mean(gray_check) < 127:
            image = cv2.bitwise_not(image)

        # Resize maintaining aspect ratio so the max side is 1000px
        h_c, w_c = image.shape[:2]
        max_side = 1000
        if max(h_c, w_c) > max_side:
            scale = max_side / float(max(h_c, w_c))
            image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        else:
            scale = max_side / float(max(h_c, w_c))
            image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        # Add a light border padding (40px) around the cropped canvas
        image = cv2.copyMakeBorder(
            image, top=40, bottom=40, left=40, right=40, 
            borderType=cv2.BORDER_CONSTANT, value=[255, 255, 255]
        )

        cv2.imwrite("debug_drawing_view.png", image)
        return image

    except Exception as e:
        logger.error(f"Drawing Error: {e}")
        raise e
    

def process_photo_pipeline(image_bytes):
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Could not decode photo.")

        height, width = image.shape[:2]
        max_width = 1280
        
        if width > max_width:
            scaling_factor = max_width / float(width)
            new_height = int(height * scaling_factor)
            image = cv2.resize(image, (max_width, new_height), interpolation=cv2.INTER_AREA)
            logger.info(f"Photo processed: Resized to {max_width}px width.")

        return image
    except Exception as e:
        logger.error(f"Photo Error: {e}")
        raise e