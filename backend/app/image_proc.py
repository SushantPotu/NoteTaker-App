import numpy as np
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

        gray_check = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if np.mean(gray_check) < 127:
            image = cv2.bitwise_not(image)

        height, width = image.shape[:2]
        target_width = 1200
        if width < target_width:
            scale = target_width / float(width)
            image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        gray_final = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        gray_final = adjust_gamma(gray_final, gamma=0.5)
        
        gray_final = cv2.GaussianBlur(gray_final, (3, 3), 0)

        _, image = cv2.threshold(gray_final, 215, 255, cv2.THRESH_BINARY)
        
        image = cv2.bitwise_not(image)
        
        v_kernel = np.ones((3, 1), np.uint8)
        image = cv2.dilate(image, v_kernel, iterations=1)
        
        h_kernel = np.ones((1, 3), np.uint8)
        image = cv2.dilate(image, h_kernel, iterations=1)
        
        image = cv2.bitwise_not(image) 

        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        logger.info("Applied Processing")

        image = cv2.copyMakeBorder(
            image, top=100, bottom=100, left=100, right=100, 
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