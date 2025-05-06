from ultralytics import YOLO
from PIL import Image
import numpy as np
import cv2

def load_models():
    classification_model = YOLO('models/classification_model.pt')
    segmentation_model = YOLO('models/segmentation_model.pt')
    return classification_model, segmentation_model

def classify_image(image, classification_model):
    results = classification_model(image, verbose=True)
    category = results[0].probs.top5
    return category

def segment_image(image, segmentation_model):
    results = segmentation_model(image, agnostic_nms=True, retina_masks=True, verbose=True)
    return results

def tile_pattern(image_size, pattern_image):
    pattern_np = np.array(pattern_image)
    pattern_height, pattern_width = pattern_np.shape[:2]

    tiled_pattern = np.tile(pattern_np, (
        image_size[1] // pattern_height + 1,
        image_size[0] // pattern_width + 1,
        1
    ))

    return Image.fromarray(tiled_pattern[:image_size[1], :image_size[0]])

def apply_mask(image, mask, pattern_image, head_image):
    image_np = np.array(image)
    mask_np = np.array(mask)

    tiled_pattern = tile_pattern(image.size, pattern_image)
    tiled_pattern_np = np.array(tiled_pattern)

    mask_indices = np.argwhere(mask_np > 0)
    if mask_indices.size > 0:
        min_y, min_x = mask_indices.min(axis=0)
        max_y, max_x = mask_indices.max(axis=0)

        dst_points = np.float32([
            [min_x, min_y],
            [max_x, min_y],
            [max_x, max_y],
            [min_x, max_y]
        ])

        head_width, head_height = head_image.size
        src_points = np.float32([
            [0, 0],
            [head_width, 0],
            [head_width, head_height],
            [0, head_height]
        ])

        matrix = cv2.getPerspectiveTransform(src_points, dst_points)
        head_np = np.array(head_image)
        transformed_head = cv2.warpPerspective(head_np, matrix, (image.size[0], image.size[1]))

        overlay = Image.fromarray(transformed_head, 'RGBA')
        image_with_head = Image.alpha_composite(Image.fromarray(image_np).convert("RGBA"), overlay)
        return image_with_head.convert("RGB")
    return Image.fromarray(image_np)
