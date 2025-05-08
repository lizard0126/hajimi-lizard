from ultralytics import YOLO
from PIL import Image
import numpy as np
import cv2

def load_models() -> tuple[YOLO, YOLO]:
    classification_model = YOLO('models/classification_model.pt')
    segmentation_model = YOLO('models/segmentation_model.pt')
    return classification_model, segmentation_model

def classify_image(image, classification_model: YOLO):
    results = classification_model(image, verbose=True)
    category = results[0].probs.top5
    return category

def segment_image(image, segmentation_model: YOLO):
    results = segmentation_model(image, agnostic_nms=True, retina_masks=True, verbose=True)
    return results

def tile_pattern(image_size, pattern_image):
    pattern_height, pattern_width = pattern_image.shape[:2]

    tiled_pattern = np.tile(pattern_image, (
        image_size[1] // pattern_height + 1,
        image_size[0] // pattern_width + 1,
        1
    ))

    return Image.fromarray(tiled_pattern[:image_size[1], :image_size[0]])

def apply_mask(image: np.ndarray, mask: np.ndarray, pattern_image: np.ndarray, head_image: np.ndarray) -> np.ndarray:
    mask_indices = np.argwhere(mask > 0)
    if mask_indices.size > 0:
        min_y, min_x = mask_indices.min(axis=0)
        max_y, max_x = mask_indices.max(axis=0)
        
        dst_points = np.array([
            [min_x, min_y],
            [max_x, min_y],
            [max_x, max_y],
            [min_x, max_y]
        ], dtype=np.float32)

        head_height, head_width = head_image.shape[:2]
        src_points = np.array([
            [0, 0],
            [head_width, 0],
            [head_width, head_height],
            [0, head_height]
        ], dtype=np.float32)

        matrix = cv2.getPerspectiveTransform(src_points, dst_points)
        transformed_head = cv2.warpPerspective(head_image, matrix, image.shape[:2][::-1])

        alpha_channel = (transformed_head[:,:,3] / 255)[:,:,np.newaxis]
        image_with_head = (alpha_channel * transformed_head[:,:,:3] + (1 - alpha_channel) * image).astype(np.uint8)
        return image_with_head
    return image

def to_rgb(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2: # Gray
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.ndim == 3 and image.shape[2] == 1: # Gray
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.ndim == 3 and image.shape[2] == 4: # RGBA
        image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
    return image

def to_rgba(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2: # Gray
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGBA)
    elif image.ndim == 3 and image.shape[2] == 1: # Gray
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGBA)
    elif image.ndim == 3 and image.shape[2] == 3: # RGBA
        image = cv2.cvtColor(image, cv2.COLOR_RGB2RGBA)
    return image
